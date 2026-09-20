const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function colRefToIdx(colStr) {
  let idx = 0;
  for (let i = 0; i < colStr.length; i++) {
    idx = idx * 26 + (colStr.charCodeAt(i) - 64);
  }
  return idx - 1;
}

/**
 * Parse .docx document into clean HTML and plain text
 */
function parseDocx(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const docEntry = zip.getEntry('word/document.xml');
    if (!docEntry) {
      return { error: 'Invalid DOCX: missing document.xml' };
    }

    const xml = docEntry.getData().toString('utf8');
    const htmlParts = [];
    const textLines = [];

    const pRegex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
    let match;

    while ((match = pRegex.exec(xml)) !== null) {
      const pContent = match[1];

      let headingLevel = 0;
      const headingMatch = pContent.match(/<w:pStyle\s+[^>]*w:val=["']Heading([1-6])["']/i);
      if (headingMatch) {
        headingLevel = parseInt(headingMatch[1], 10);
      }

      const isList = /<w:numPr>/i.test(pContent);
      const rRegex = /<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g;
      let rMatch;
      let pText = '';
      let pHtml = '';

      while ((rMatch = rRegex.exec(pContent)) !== null) {
        const rContent = rMatch[1];
        const isBold = /<w:b(?:\s[^>]*|\/?)>/i.test(rContent);
        const isItalic = /<w:i(?:\s[^>]*|\/?)>/i.test(rContent);
        const isUnderline = /<w:u(?:\s[^>]*|\/?)>/i.test(rContent);

        const tRegex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
        let tMatch;
        let runText = '';
        while ((tMatch = tRegex.exec(rContent)) !== null) {
          runText += tMatch[1];
        }

        if (runText) {
          pText += runText;
          let formatted = escapeHtml(runText);
          if (isBold) formatted = `<strong>${formatted}</strong>`;
          if (isItalic) formatted = `<em>${formatted}</em>`;
          if (isUnderline) formatted = `<u>${formatted}</u>`;
          pHtml += formatted;
        }
      }

      if (pText.trim()) {
        textLines.push(pText.trim());
        if (headingLevel > 0) {
          htmlParts.push(`<h${headingLevel} class="font-bold text-slate-100 my-2 text-${headingLevel === 1 ? 'xl' : headingLevel === 2 ? 'lg' : 'base'}">${pHtml}</h${headingLevel}>`);
        } else if (isList) {
          htmlParts.push(`<li class="ml-4 list-disc text-slate-300 my-1">${pHtml}</li>`);
        } else {
          htmlParts.push(`<p class="text-slate-300 my-1.5 leading-relaxed">${pHtml}</p>`);
        }
      }
    }

    const tblRegex = /<w:tbl(?:\s[^>]*)?>([\s\S]*?)<\/w:tbl>/g;
    let tblMatch;
    while ((tblMatch = tblRegex.exec(xml)) !== null) {
      const tblContent = tblMatch[1];
      const rows = [];
      const trRegex = /<w:tr(?:\s[^>]*)?>([\s\S]*?)<\/w:tr>/g;
      let trMatch;
      while ((trMatch = trRegex.exec(tblContent)) !== null) {
        const trContent = trMatch[1];
        const cells = [];
        const tcRegex = /<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/g;
        let tcMatch;
        while ((tcMatch = tcRegex.exec(trContent)) !== null) {
          const tcContent = tcMatch[1];
          const tMatches = tcContent.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) || [];
          const cellText = tMatches.map(t => t.replace(/<\/?w:t(?:\s[^>]*)?>/g, '')).join(' ');
          cells.push(escapeHtml(cellText.trim()));
        }
        if (cells.length > 0) rows.push(cells);
      }

      if (rows.length > 0) {
        let tableHtml = '<div class="overflow-x-auto my-4"><table class="w-full border-collapse border border-slate-700 text-xs text-left">';
        rows.forEach((row, rIdx) => {
          tableHtml += `<tr class="${rIdx === 0 ? 'bg-slate-800 font-semibold' : 'border-t border-slate-700'}">`;
          row.forEach(cell => {
            tableHtml += `<td class="p-2 border border-slate-700">${cell}</td>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</table></div>';
        htmlParts.push(tableHtml);
      }
    }

    return {
      type: 'document',
      format: 'docx',
      html: htmlParts.join('\n'),
      text: textLines.join('\n\n')
    };
  } catch (err) {
    return { error: `Failed to parse DOCX: ${err.message}` };
  }
}

/**
 * Parse .odt (OpenDocument Text)
 */
function parseOdt(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const contentEntry = zip.getEntry('content.xml');
    if (!contentEntry) {
      return { error: 'Invalid ODT: missing content.xml' };
    }

    const xml = contentEntry.getData().toString('utf8');
    const htmlParts = [];
    const textLines = [];

    const tagRegex = /<text:(p|h)[^>]*>([\s\S]*?)<\/text:(?:p|h)>/g;
    let match;

    while ((match = tagRegex.exec(xml)) !== null) {
      const isHeading = match[1] === 'h';
      const inner = match[2];
      const cleanText = inner.replace(/<[^>]+>/g, '').trim();

      if (cleanText) {
        textLines.push(cleanText);
        if (isHeading) {
          htmlParts.push(`<h2 class="font-bold text-slate-100 my-2 text-lg">${escapeHtml(cleanText)}</h2>`);
        } else {
          htmlParts.push(`<p class="text-slate-300 my-1.5 leading-relaxed">${escapeHtml(cleanText)}</p>`);
        }
      }
    }

    return {
      type: 'document',
      format: 'odt',
      html: htmlParts.join('\n'),
      text: textLines.join('\n\n')
    };
  } catch (err) {
    return { error: `Failed to parse ODT: ${err.message}` };
  }
}

/**
 * Parse .pptx (PowerPoint)
 */
function parsePptx(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    const slideEntries = entries.filter(e => e.entryName.match(/^ppt\/slides\/slide\d+\.xml$/));

    slideEntries.sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)\.xml/)?.[1] || '0', 10);
      const numB = parseInt(b.entryName.match(/slide(\d+)\.xml/)?.[1] || '0', 10);
      return numA - numB;
    });

    const slides = [];

    slideEntries.forEach((entry, idx) => {
      const xml = entry.getData().toString('utf8');
      const paragraphs = [];
      const pRegex = /<a:p(?:\s[^>]*)?>([\s\S]*?)<\/a:p>/g;
      let match;

      while ((match = pRegex.exec(xml)) !== null) {
        const pContent = match[1];
        const tMatches = pContent.match(/<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>/g) || [];
        const text = tMatches.map(t => t.replace(/<\/?a:t(?:\s[^>]*)?>/g, '')).join('');
        if (text.trim()) {
          paragraphs.push(text.trim());
        }
      }

      const title = paragraphs.length > 0 ? paragraphs[0] : `Slide ${idx + 1}`;
      const content = paragraphs.length > 1 ? paragraphs.slice(1) : [];

      slides.push({
        slideNumber: idx + 1,
        title,
        content
      });
    });

    return {
      type: 'presentation',
      format: 'pptx',
      slideCount: slides.length,
      slides
    };
  } catch (err) {
    return { error: `Failed to parse PPTX: ${err.message}` };
  }
}

/**
 * Parse .odp (OpenDocument Presentation)
 */
function parseOdp(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const contentEntry = zip.getEntry('content.xml');
    if (!contentEntry) {
      return { error: 'Invalid ODP: missing content.xml' };
    }

    const xml = contentEntry.getData().toString('utf8');
    const pageRegex = /<draw:page(?:\s[^>]*)?>([\s\S]*?)<\/draw:page>/g;
    const slides = [];
    let pageMatch;
    let slideIdx = 1;

    while ((pageMatch = pageRegex.exec(xml)) !== null) {
      const pageXml = pageMatch[1];
      const pRegex = /<text:p(?:\s[^>]*)?>([\s\S]*?)<\/text:p>/g;
      const paragraphs = [];
      let pMatch;

      while ((pMatch = pRegex.exec(pageXml)) !== null) {
        const raw = pMatch[1].replace(/<[^>]+>/g, '').trim();
        if (raw) paragraphs.push(raw);
      }

      const title = paragraphs.length > 0 ? paragraphs[0] : `Slide ${slideIdx}`;
      const content = paragraphs.length > 1 ? paragraphs.slice(1) : [];

      slides.push({
        slideNumber: slideIdx++,
        title,
        content
      });
    }

    return {
      type: 'presentation',
      format: 'odp',
      slideCount: slides.length,
      slides
    };
  } catch (err) {
    return { error: `Failed to parse ODP: ${err.message}` };
  }
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

/**
 * Parse legacy .doc (binary Word format)
 */
function parseDoc(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const textPieces = [];
    let currentStr = '';

    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
        currentStr += String.fromCharCode(byte);
      } else {
        if (currentStr.trim().length >= 4) {
          if (!/^[A-Za-z0-9+/=]{20,}$/.test(currentStr) && !/^[\x00-\x1f]/.test(currentStr)) {
            textPieces.push(currentStr.trim());
          }
        }
        currentStr = '';
      }
    }
    if (currentStr.trim().length >= 4) {
      textPieces.push(currentStr.trim());
    }

    const filtered = textPieces.filter(s => {
      if (s.length < 3) return false;
      if (/^(Microsoft Word|Times New Roman|Arial|Calibri|Normal|Default Paragraph Font)/i.test(s)) return false;
      return true;
    });

    const paragraphs = filtered.slice(0, 100);
    const html = paragraphs.map(p => `<p class="text-slate-300 my-1.5 leading-relaxed">${escapeHtml(p)}</p>`).join('\n');

    return {
      type: 'document',
      format: 'doc',
      html: html || '<p class="text-slate-500 italic">No readable text found in binary DOC file.</p>',
      text: paragraphs.join('\n\n')
    };
  } catch (err) {
    return { error: `Failed to parse DOC: ${err.message}` };
  }
}

/**
 * Parse .rtf (Rich Text Format)
 */
function parseRtf(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    // Strip header and RTF commands
    let text = raw
      .replace(/\\par[d]?\s?/g, '\n')
      .replace(/\\tab\s?/g, '\t')
      .replace(/\\'[0-9a-fA-F]{2}/g, '')
      .replace(/\\[a-zA-Z]+-?\d*\s?/g, '')
      .replace(/[{}]/g, '')
      .trim();

    const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(Boolean);
    const html = paragraphs.map(p => `<p class="text-slate-300 my-1.5 leading-relaxed">${escapeHtml(p)}</p>`).join('\n');

    return {
      type: 'document',
      format: 'rtf',
      html,
      text: paragraphs.join('\n\n')
    };
  } catch (err) {
    return { error: `Failed to parse RTF: ${err.message}` };
  }
}

/**
 * Parse .epub (Electronic Publication E-book)
 */
function parseEpub(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();

    // Look for HTML / XHTML files
    const htmlEntries = entries.filter(e => e.entryName.match(/\.(xhtml|html|htm)$/i) && !e.entryName.includes('toc.'));
    htmlEntries.sort((a, b) => a.entryName.localeCompare(b.entryName));

    const chapters = [];
    htmlEntries.slice(0, 30).forEach((entry, idx) => {
      const html = entry.getData().toString('utf8');
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const inner = bodyMatch ? bodyMatch[1] : html;
      const cleanHtml = inner
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<img[^>]*>/gi, '');

      chapters.push({
        chapterIndex: idx + 1,
        title: `Chapter ${idx + 1}`,
        html: cleanHtml
      });
    });

    return {
      type: 'epub',
      format: 'epub',
      chapterCount: chapters.length,
      chapters
    };
  } catch (err) {
    return { error: `Failed to parse EPUB: ${err.message}` };
  }
}

function parseDocument(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();
  switch (ext) {
    case '.docx':
      return parseDocx(filePath);
    case '.odt':
      return parseOdt(filePath);
    case '.pptx':
      return parsePptx(filePath);
    case '.odp':
      return parseOdp(filePath);
    case '.doc':
      return parseDoc(filePath);
    case '.rtf':
      return parseRtf(filePath);
    case '.xlsx':
      return parseXlsx(filePath);
    case '.ods':
      return parseOds(filePath);
    case '.csv':
      return parseCsv(filePath, false);
    case '.tsv':
      return parseCsv(filePath, true);
    case '.epub':
      return parseEpub(filePath);
    default:
      return { error: `Unsupported document format: ${ext}` };
  }
}

module.exports = {
  parseDocument,
  parseDocx,
  parseOdt,
  parsePptx,
  parseOdp,
  parseDoc,
  parseXlsx,
  parseOds,
  parseCsv,
  parseRtf,
  parseEpub
};
