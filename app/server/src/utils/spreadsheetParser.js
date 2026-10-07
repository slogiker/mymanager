const fs = require('fs');
const AdmZip = require('adm-zip');

function colRefToIdx(colStr) {
  let idx = 0;
  for (let i = 0; i < colStr.length; i++) {
    idx = idx * 26 + (colStr.charCodeAt(i) - 64);
  }
  return idx - 1;
}

/**
 * Parse .xlsx (Excel Spreadsheet)
 */
function parseXlsx(filePath) {
  try {
    const zip = new AdmZip(filePath);

    // 1. Shared Strings
    const sharedStrings = [];
    const ssEntry = zip.getEntry('xl/sharedStrings.xml');
    if (ssEntry) {
      const ssXml = ssEntry.getData().toString('utf8');
      const siRegex = /<si>([\s\S]*?)<\/si>/g;
      let m;
      while ((m = siRegex.exec(ssXml)) !== null) {
        const inner = m[1];
        const tMatches = inner.match(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g) || [];
        const text = tMatches.map(t => t.replace(/<\/?t(?:\s[^>]*)?>/g, '')).join('');
        sharedStrings.push(text);
      }
    }

    // 2. Sheets in workbook
    const sheets = [];
    const wbEntry = zip.getEntry('xl/workbook.xml');
    if (wbEntry) {
      const wbXml = wbEntry.getData().toString('utf8');
      const sheetRegex = /<sheet\s+[^>]*name=["']([^"']+)["'][^>]*sheetId=["'](\d+)["']/g;
      let sm;
      while ((sm = sheetRegex.exec(wbXml)) !== null) {
        sheets.push({ name: sm[1], id: sm[2] });
      }
    }

    if (sheets.length === 0) {
      sheets.push({ name: 'Sheet 1', id: '1' });
    }

    // 3. Parse worksheets
    const parsedSheets = [];
    sheets.forEach((sh, idx) => {
      const sheetFile = zip.getEntry(`xl/worksheets/sheet${idx + 1}.xml`) ||
                        zip.getEntry(`xl/worksheets/sheet${sh.id}.xml`);
      if (!sheetFile) return;

      const xml = sheetFile.getData().toString('utf8');
      const rows = [];
      const rowRegex = /<row\s+[^>]*r=["'](\d+)["'][^>]*>([\s\S]*?)<\/row>/g;
      let rm;
      let maxCols = 0;

      while ((rm = rowRegex.exec(xml)) !== null) {
        const rowContent = rm[2];
        const cells = [];
        const cRegex = /<c\s+([^>]*?)>(?:<v>([\s\S]*?)<\/v>|<is><t>([\s\S]*?)<\/t><\/is>)?<\/c>/g;
        let cm;

        while ((cm = cRegex.exec(rowContent)) !== null) {
          const cAttrs = cm[1];
          const val = cm[2];
          const inlineVal = cm[3];

          const rMatch = cAttrs.match(/r=["']([A-Z]+)(\d+)["']/);
          const colLetters = rMatch ? rMatch[1] : null;
          const colIdx = colLetters ? colRefToIdx(colLetters) : cells.length;

          // Limit to 60 columns to prevent huge sparse memory issues
          if (colIdx > 60) continue;

          const isShared = /t=["']s["']/.test(cAttrs);
          let cellText = '';
          if (inlineVal !== undefined) {
            cellText = inlineVal;
          } else if (val !== undefined) {
            if (isShared) {
              const ssIdx = parseInt(val, 10);
              cellText = sharedStrings[ssIdx] ?? val;
            } else {
              cellText = val;
            }
          }

          while (cells.length < colIdx) {
            cells.push('');
          }
          cells[colIdx] = cellText;
        }

        if (cells.length > maxCols) maxCols = cells.length;
        if (cells.length > 0) rows.push(cells);
      }

      parsedSheets.push({
        name: sh.name,
        rowCount: rows.length,
        colCount: maxCols,
        rows: rows.slice(0, 500) // cap to first 500 rows for high performance
      });
    });

    return {
      type: 'spreadsheet',
      format: 'xlsx',
      sheetCount: parsedSheets.length,
      sheets: parsedSheets
    };
  } catch (err) {
    return { error: `Failed to parse XLSX: ${err.message}` };
  }
}

/**
 * Parse .ods (OpenDocument Spreadsheet)
 */
function parseOds(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const contentEntry = zip.getEntry('content.xml');
    if (!contentEntry) return { error: 'Invalid ODS: missing content.xml' };

    const xml = contentEntry.getData().toString('utf8');
    const tableRegex = /<table:table\s+[^>]*table:name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/table:table>/g;
    const sheets = [];
    let tm;

    while ((tm = tableRegex.exec(xml)) !== null) {
      const sheetName = tm[1];
      const sheetXml = tm[2];
      const rows = [];
      const rowRegex = /<table:table-row(?:\s[^>]*)?>([\s\S]*?)<\/table:table-row>/g;
      let rm;
      let maxCols = 0;

      while ((rm = rowRegex.exec(sheetXml)) !== null) {
        const rowXml = rm[1];
        const cells = [];
        const cellRegex = /<table:table-cell(?:\s+([^>]*))?>([\s\S]*?)<\/table:table-cell>/g;
        let cm;

        while ((cm = cellRegex.exec(rowXml)) !== null) {
          const attrs = cm[1] || '';
          const inner = cm[2] || '';
          const repeatMatch = attrs.match(/table:number-columns-repeated=["'](\d+)["']/);
          const repeat = repeatMatch ? Math.min(parseInt(repeatMatch[1], 10), 10) : 1;

          const textMatch = inner.match(/<text:p[^>]*>([\s\S]*?)<\/text:p>/g) || [];
          const cellText = textMatch.map(t => t.replace(/<[^>]+>/g, '')).join(' ').trim();

          for (let k = 0; k < repeat; k++) {
            if (cells.length < 50) cells.push(cellText);
          }
        }

        if (cells.length > maxCols) maxCols = cells.length;
        if (cells.some(c => c.length > 0)) rows.push(cells);
      }

      sheets.push({
        name: sheetName,
        rowCount: rows.length,
        colCount: maxCols,
        rows: rows.slice(0, 500)
      });
    }

    return {
      type: 'spreadsheet',
      format: 'ods',
      sheetCount: sheets.length,
      sheets
    };
  } catch (err) {
    return { error: `Failed to parse ODS: ${err.message}` };
  }
}

/**
 * Parse .csv or .tsv delimited spreadsheet
 */
function parseCsv(filePath, isTsv = false) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const delimiter = isTsv ? '\t' : ',';
    const lines = raw.split(/\r?\n/);
    const rows = [];
    let maxCols = 0;

    for (const line of lines.slice(0, 500)) {
      if (!line.trim()) continue;
      // Simple quote-aware CSV split
      const cells = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === delimiter && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      cells.push(current.trim());

      if (cells.length > maxCols) maxCols = cells.length;
      rows.push(cells);
    }

    return {
      type: 'spreadsheet',
      format: isTsv ? 'tsv' : 'csv',
      sheetCount: 1,
      sheets: [
        {
          name: isTsv ? 'TSV Data' : 'CSV Data',
          rowCount: rows.length,
          colCount: maxCols,
          rows
        }
      ]
    };
  } catch (err) {
    return { error: `Failed to parse CSV: ${err.message}` };
  }
}

module.exports = {
  parseXlsx,
  parseOds,
  parseCsv,
  colRefToIdx
};
