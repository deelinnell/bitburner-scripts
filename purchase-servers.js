/** @param {NS} ns */
export async function main(ns) {
    const home = 'home';
    const pre = "pserv-";
    const limit = ns.getPurchasedServerLimit();
    const maxRam = ns.getPurchasedServerMaxRam();
    let ram = 32;

    const scripts = {
        hack: 'hack.js',
        grow: 'grow.js',
        weaken: 'weaken.js'
    }

    async function wait() {
	while (ns.getServerMoneyAvailable(home) > ns.getPurchasedServerCost(ram) === false) {
		await ns.sleep(30000);
	}
    }

    async function purchase(name) {
        await wait();
	ns.purchaseServer(name, ram);
    }

    async function upgrade(name) {
        await wait();
        killScripts(name);
        ns.deleteServer(name);
        ns.purchaseServer(name, ram);
    }

    function killScripts(name) {
        for (let script in scripts) {
            if (ns.scriptRunning(scripts[script], name)) ns.scriptKill(scripts[script], name);
        }
    }

    function copyScripts(name) {
        for (let script in scripts) {
            ns.scp(scripts[script], name, "home");
        }
    }

    async function purchaseUpgradeServers() {
        let i = 0;
        while (i < limit) {
            let name = pre + i;
            if (ns.serverExists(name)) {
                await upgrade(name);
                i++;
            } else {
                await purchase(name);
                i++;
            }
            copyScripts(name);
        }
    }

    while(true) {
        await purchaseUpgradeServers();
        if (ram === maxRam) break;
        ram *= 2;
    }
}
