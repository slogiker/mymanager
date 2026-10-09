const si = require('systeminformation');
async function test() {
    try {
        const mem = await si.mem();
        const procs = await si.processes();
        const cpu = await si.cpu();
        const load = await si.currentLoad();
        console.log("Mem:", mem.used, mem.total);
        console.log("Top Proc:", procs.list.sort((a, b) => b.memRss - a.memRss).slice(0, 3).map(p => p.name));
        console.log("CPU:", cpu.speed, cpu.speedMax, load.currentLoad);
    } catch (e) {
        console.error(e);
    }
}
test();
