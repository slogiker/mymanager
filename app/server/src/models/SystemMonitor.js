const si = require('systeminformation');
const os = require('os');

class SystemMonitor {
  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  }

  async getPironmanStats() {
    const urls = [
      process.env.PIRONMAN_API_URL,
      'http://host.docker.internal:34001/api/v1.0/get-data',
      'http://localhost:34001/api/v1.0/get-data',
      'http://127.0.0.1:34001/api/v1.0/get-data'
    ].filter(Boolean);

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const json = await res.json();
          if (json.status && json.data) {
            return json.data;
          }
        }
      } catch (err) {
        // Silently fail and try next URL
      }
    }
    return null;
  }

  async getStats() {
    try {
      // Try fetching Pironman5 stats first
      const pmData = await this.getPironmanStats();
      if (pmData) {
        // Map disk total, used, free, percent from pmData (e.g. disk_/dev/nvme0n1_total)
        let diskTotal = 0;
        let diskUsed = 0;
        let diskFree = 0;
        let diskPercent = 0;

        for (const key of Object.keys(pmData)) {
          if (key.startsWith('disk_') && key.endsWith('_total')) {
            const val = pmData[key];
            if (val > 0) {
              const prefix = key.slice(0, -6);
              diskTotal = val;
              diskUsed = pmData[`${prefix}_used`] || 0;
              diskFree = pmData[`${prefix}_free`] || 0;
              diskPercent = pmData[`${prefix}_percent`] || 0;
              break;
            }
          }
        }

        // Query local top processes for dashboard list
        let topProcesses = [];
        try {
          const processes = await si.processes();
          topProcesses = (processes.list || [])
            .sort((a, b) => b.memPercent - a.memPercent)
            .slice(0, 3)
            .map(p => ({
              name: p.name,
              memPercent: `${p.memPercent.toFixed(1)}%`,
              memUsage: this.formatBytes(p.memVsz * 1024),
              cpu: `${p.pcpu.toFixed(1)}%`,
            }));
        } catch {}

        return {
          memory: {
            total: this.formatBytes(pmData.memory_total),
            used: this.formatBytes(pmData.memory_used),
            free: this.formatBytes(pmData.memory_available),
            percent: Math.round(pmData.memory_percent),
            topProcesses,
          },
          cpu: {
            model: 'Raspberry Pi 5',
            cores: pmData.cpu_count || 4,
            load: (pmData.cpu_percent || 0).toFixed(2),
            speedMain: `${(pmData.cpu_freq / 1000).toFixed(2)} GHz`,
            speedMax: `${(pmData.cpu_freq_max / 1000).toFixed(2)} GHz`,
          },
          temperature: `${(pmData.cpu_temperature || 0).toFixed(1)}°C`,
          disk: {
            total: this.formatBytes(diskTotal),
            used: this.formatBytes(diskUsed),
            free: this.formatBytes(diskFree),
            percent: Math.round(diskPercent),
          },
          uptime: this.formatUptime(Math.floor(Date.now() / 1000 - pmData.boot_time)),
          platform: 'Raspberry Pi OS (RPi5)',
        };
      }
    } catch (e) {
      // If pironman fetch throws, fall through to default systeminformation
    }

    try {
      const [mem, cpu, cpuLoad, temp, fsSize, processes] = await Promise.all([
        si.mem(), si.cpu(), si.currentLoad(), si.cpuTemperature(), si.fsSize(), si.processes(),
      ]);

      let diskSize = 0;
      let diskUsed = 0;
      try {
        const root = fsSize.find(f => f.mount === '/') || fsSize[0];
        if (root && root.size) {
          diskSize = root.size;
          diskUsed = root.used;
        } else {
          // Fallback to df -k / for Docker containers on Linux
          const { execSync } = require('child_process');
          const stdout = execSync('df -k /').toString();
          const lines = stdout.trim().split('\n');
          if (lines.length > 1) {
            const parts = lines[1].replace(/\s+/g, ' ').split(' ');
            if (parts.length > 3) {
              const totalK = parseInt(parts[1]);
              const usedK = parseInt(parts[2]);
              diskSize = totalK * 1024;
              diskUsed = usedK * 1024;
            }
          }
        }
      } catch (err) {}

      let temperature = 'N/A';
      if (temp.main) {
        temperature = `${temp.main.toFixed(1)}°C`;
      } else {
        const fs = require('fs');
        const paths = [
          '/sys/class/thermal/thermal_zone0/temp',
          '/sys/class/thermal/thermal_zone1/temp',
          '/sys/class/thermal/thermal_zone2/temp',
          '/host/sys/class/thermal/thermal_zone0/temp',
          '/host/sys/class/thermal/thermal_zone1/temp',
        ];
        for (const p of paths) {
          try {
            if (fs.existsSync(p)) {
              const t = fs.readFileSync(p, 'utf8');
              temperature = `${(parseInt(t) / 1000).toFixed(1)}°C`;
              break;
            }
          } catch {}
        }
      }

      const topProcesses = (processes.list || [])
        .sort((a, b) => b.memPercent - a.memPercent)
        .slice(0, 3)
        .map(p => ({
          name: p.name,
          memPercent: `${p.memPercent.toFixed(1)}%`,
          memUsage: this.formatBytes(p.memVsz * 1024),
          cpu: `${p.pcpu.toFixed(1)}%`,
        }));

      return {
        memory: {
          total: this.formatBytes(mem.total),
          used: this.formatBytes(mem.active),
          free: this.formatBytes(mem.available),
          percent: Math.round((mem.active / mem.total) * 100),
          topProcesses,
        },
        cpu: {
          model: `${cpu.manufacturer} ${cpu.brand}`.trim(),
          cores: cpu.cores,
          load: cpuLoad.currentLoad.toFixed(2),
          speedMain: `${cpu.speed} GHz`,
          speedMax: `${cpu.speedMax} GHz`,
        },
        temperature,
        disk: {
          total: this.formatBytes(diskSize),
          used: this.formatBytes(diskUsed),
          free: this.formatBytes(diskSize - diskUsed),
          percent: diskSize ? Math.round((diskUsed / diskSize) * 100) : 0,
        },
        uptime: this.formatUptime(os.uptime()),
        platform: `${os.type()} ${os.release()} (${os.arch()})`,
      };
    } catch {
      return this.getFallback();
    }
  }

  getFallback() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return {
      memory: { total: this.formatBytes(totalMem), used: this.formatBytes(totalMem - freeMem), free: this.formatBytes(freeMem), percent: Math.round(((totalMem - freeMem) / totalMem) * 100), topProcesses: [] },
      cpu: { model: os.cpus()[0]?.model || 'Unknown', cores: os.cpus().length, load: (os.loadavg()[0] * 10).toFixed(2), speedMain: `${(os.cpus()[0]?.speed / 1000 || 0).toFixed(1)} GHz`, speedMax: 'N/A' },
      temperature: 'N/A',
      disk: { total: 'N/A', used: 'N/A', free: 'N/A', percent: 0 },
      uptime: this.formatUptime(os.uptime()),
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
    };
  }
}

module.exports = SystemMonitor;
