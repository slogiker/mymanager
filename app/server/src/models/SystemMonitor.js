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

  async getStats() {
    try {
      const [mem, cpu, cpuLoad, temp, fsSize, processes] = await Promise.all([
        si.mem(), si.cpu(), si.currentLoad(), si.cpuTemperature(), si.fsSize(), si.processes(),
      ]);

      const root = fsSize.find(f => f.mount === '/') || fsSize[0] || {};

      let temperature = 'N/A';
      if (temp.main) {
        temperature = `${temp.main.toFixed(1)}°C`;
      } else {
        try {
          const t = require('fs').readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8');
          temperature = `${(parseInt(t) / 1000).toFixed(1)}°C`;
        } catch {}
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
          total: this.formatBytes(root.size || 0),
          used: this.formatBytes(root.used || 0),
          free: this.formatBytes((root.size - root.used) || 0),
          percent: root.size ? Math.round((root.used / root.size) * 100) : 0,
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
