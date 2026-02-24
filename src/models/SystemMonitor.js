const os = require('os');
const fs = require('fs');
const si = require('systeminformation');

class SystemMonitor {
    async getStats() {
        try {
            const [mem, cpu, cpuLoad, temp, fsSize, processes] = await Promise.all([
                si.mem(),
                si.cpu(),
                si.currentLoad(),
                si.cpuTemperature(),
                si.fsSize(),
                si.processes()
            ]);

            // Memory formatting
            const totalMem = mem.total;
            const usedMem = mem.active || mem.used;
            const freeMem = mem.available || mem.free;
            const memUsage = (usedMem / totalMem) * 100;

            // Get top 3 memory consuming processes
            const topProcs = processes.list
                .sort((a, b) => b.memRss - a.memRss)
                .slice(0, 3)
                .map(p => ({
                    name: p.name,
                    memPercent: p.pmem ? p.pmem.toFixed(1) : ((p.memRss * 1024 / totalMem) * 100).toFixed(1),
                    memUsage: this.formatBytes(p.memRss * 1024) // memRss is usually in KB
                }));

            // CPU info
            const cpuModel = (cpu.manufacturer + ' ' + cpu.brand).trim() || os.cpus()[0].model;
            const loadAvg = cpuLoad.currentLoad;

            // Find main disk (usually mounted at '/')
            const mainDisk = fsSize.find(d => d.mount === '/') || fsSize[0];
            const diskStats = mainDisk ? {
                total: this.formatBytes(mainDisk.size),
                used: this.formatBytes(mainDisk.used),
                free: this.formatBytes(mainDisk.size - mainDisk.used),
                percent: Math.round(mainDisk.use)
            } : { total: 'N/A', used: 'N/A', free: 'N/A', percent: 0 };

            // Raspberry Pi Temperature fallback just in case si.cpuTemperature() is empty
            let piTemp = 'N/A';
            if (temp && temp.main) {
                piTemp = temp.main.toFixed(1) + '°C';
            } else {
                try {
                    if (fs.existsSync('/sys/class/thermal/thermal_zone0/temp')) {
                        const tempRaw = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8');
                        piTemp = (parseInt(tempRaw) / 1000).toFixed(1) + '°C';
                    }
                } catch (e) { }
            }

            return {
                memory: {
                    total: this.formatBytes(totalMem),
                    used: this.formatBytes(usedMem),
                    free: this.formatBytes(freeMem),
                    percent: Math.round(memUsage),
                    topProcesses: topProcs
                },
                cpu: {
                    model: cpuModel,
                    cores: cpu.cores || os.cpus().length,
                    load: loadAvg ? loadAvg.toFixed(2) : os.loadavg()[0].toFixed(2),
                    speedMain: cpu.speed ? cpu.speed + ' GHz' : 'N/A',
                    speedMax: cpu.speedMax ? cpu.speedMax + ' GHz' : 'N/A'
                },
                temperature: piTemp,
                disk: diskStats,
                uptime: this.formatUptime(os.uptime()),
                platform: `${os.type()} ${os.release()} (${os.arch()})`
            };
        } catch (error) {
            console.error('System Monitor Error:', error);
            return this.getFallbackStats();
        }
    }

    getFallbackStats() {
        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        const usedMem = totalMem - freeMem;
        return {
            memory: {
                total: this.formatBytes(totalMem),
                used: this.formatBytes(usedMem),
                free: this.formatBytes(freeMem),
                percent: Math.round((usedMem / totalMem) * 100),
                topProcesses: []
            },
            cpu: {
                model: os.cpus()[0]?.model || 'Unknown',
                cores: os.cpus().length,
                load: os.loadavg()[0].toFixed(2),
                speedMain: 'N/A',
                speedMax: 'N/A'
            },
            temperature: 'N/A',
            disk: { total: 'N/A', used: 'N/A', free: 'N/A', percent: 0 },
            uptime: this.formatUptime(os.uptime()),
            platform: `${os.type()} ${os.release()} (${os.arch()})`
        };
    }

    formatBytes(bytes) {
        if (bytes === 0 || isNaN(bytes)) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatUptime(seconds) {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds % (3600 * 24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        return `${d}d ${h}h ${m}m`;
    }
}

module.exports = new SystemMonitor();
