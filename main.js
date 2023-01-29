/** @param {NS} ns */
export async function main(ns) {

    const scripts = {
        hack: 'hack.js',
        grow: 'grow.js',
        weaken: 'weaken.js'
    }

    const viruses = {
        'BruteSSH.exe': ns.brutessh,
        'FTPCrack.exe': ns.ftpcrack,
        'relaySMTP.exe': ns.relaysmtp,
        'HTTPWorm.exe': ns.httpworm,
        'SQLInject.exe': ns.sqlinject,
    }

    //=============================
    //===== NETWORK FUNCTIONS =====
    //=============================

    function getNetworkNodes(node = 'home', discovered = {}, network = []) {
        let neighbors = ns.scan(node);
        network.push(node);
        discovered[node] = true;
        // Use DFS to find all servers on the network.
        for (let i = 0; i < neighbors.length; i++) {
            let newNode = neighbors[i];
            if (!discovered[newNode]) {
                getNetworkNodes(newNode, discovered, network);
            }
        }
        // Returns array with each server on the network.
        return network;
    }

    function getVulnerableNodes() {
        const network = getNetworkNodes();
        const virusNum = Object.keys(viruses).filter(virus => ns.fileExists(virus, 'home')).length;
        // Filters out servers based on number of viruses player has researched.
        const vulnerable = network.filter(node => {
            return virusNum >= ns.getServerNumPortsRequired(node) && node !== 'home';
        });
        // Cracks servers that can be cracked and have not been.
        const needRootAccess = vulnerable.filter(node => ns.hasRootAccess(node) === false);
        if (needRootAccess.length > 0) {
            needRootAccess.map(node => openPorts(node, virusNum));
        }
        // Returns array of servers with all viruses loaded.
        return vulnerable;
    }

    function getHackableNodes() {
        const playerHackLevel = ns.getHackingLevel();
        const vulnerable = getVulnerableNodes();
        // Filters out each server above player hacking level.
        const hackable = vulnerable.filter(node => {
            return playerHackLevel >= ns.getServerRequiredHackingLevel(node) && node !== 'home';
        });
        // Returns array with servers that can be hacked.
        return hackable;
    }

    // Returns array with cracked servers and purchased servers.
    function getTotalAvailableNetwork() {
        const vulnerable = getVulnerableNodes();
        const allServers = ns.getPurchasedServers().concat(vulnerable);
        return allServers;
    }

    // Cracks vulnerable server.
    function openPorts(node, virusNum) {
        Object.values(viruses).splice(0, virusNum).map(file => file(node));
        ns.nuke(node);
        copyScripts(node);
    }

    // Loads each virus on cracked server.
    function copyScripts(node) {
        for (let script in scripts) {
            ns.scp(scripts[script], node, "home");
        }
    }

    //============================
    //===== ATTACK FUNCTIONS =====
    //============================

    function hackTarget(target, cycle) {
        const money = cycle > 1 ? ns.getServerMaxMoney(target) : ns.getServerMoneyAvailable(target);
        const time = ns.getHackTime(target);
        const threads = Math.floor(ns.hackAnalyzeThreads(target, money));
        const security = ns.hackAnalyzeSecurity(threads, target);
        const remainder = money - (ns.hackAnalyze(target) * threads);
        // HACK - returns object w/ time and threads required, plus security and money results.
        return {
            time,
            threads,
            security,
            remainder
        }
    }

    function growTarget(target, money) {
        const time = ns.getGrowTime(target);
        const growth = 100 / (money * 100 / ns.getServerMaxMoney(target));
        const threads = Math.floor(ns.growthAnalyze(target, 100));
        const security = ns.growthAnalyzeSecurity(threads, target, 1);
        // GROW - returns object w/ time and threads required, plus security and growth results.
        return {
            time,
            threads,
            security,
            growth
        }
    }

    function weakenTarget(target, security) {
        const weak = ns.weakenAnalyze(1);
        const time = ns.getWeakenTime(target);
        const threads = Math.floor(security ? security / weak : ns.getServerSecurityLevel(target) / weak);
        // WEAKEN - returns object w/ time and threads required.
        return {
            time,
            threads
        }
    }

    // Main Attack Loop ==========================================
    async function mainAttackCycle(target, cycle, security) {
        // Calculate the length of each attack type
        // the number of threads required per attack
        // and the server changes from each attack.
        const weaken1 = weakenTarget(target, security);
        const hacked = hackTarget(target, cycle);
        const weaken2 = weakenTarget(target, hacked.security);
        const growth = growTarget(target, hacked.remainder);

        // Number of threads required per attack type.
        const requiredThreads = [
            weaken1.threads,
            weaken2.threads,
            growth.threads,
            hacked.threads
        ];

        // Calculate the delay required per attack to prevent overlap.
        const currentDelay = 5000;
        const weakDelay1 = currentDelay;
        const weakDelay2 = currentDelay * 2 + currentDelay;
        const growDelay = weaken2.time + weakDelay2 - growth.time + currentDelay + currentDelay;
        const hackDelay = weaken1.time - hacked.time + currentDelay + currentDelay;

        // Array with attack information required for each attack.
        const attackLoop = [{
            script: 'weaken.js',
            threads: requiredThreads[0],
            delay: weakDelay1
        }, {
            script: 'weaken.js',
            threads: requiredThreads[1],
            delay: weakDelay2
        }, {
            script: 'grow.js',
            threads: requiredThreads[2],
            delay: growDelay
        }, {
            script: 'hack.js',
            threads: requiredThreads[3],
            delay: hackDelay
        }];

        await waitForEnoughThreads(requiredThreads);
        // Start attack
        for (let i = 0; i < attackLoop.length; i++) {
            let attack = attackLoop[i];
            await ns.sleep(attack.delay);
            attackPerScript(attack, target);
        }
        cycle++;
        // Use recursion to begin calculations for next attack.
        mainAttackCycle(target, cycle, growth.security);
    }
    //=========================================================

    // Calculates if enough threads are available for an attack cycle.
    async function waitForEnoughThreads(threads) {
        let cycleThreadsRequired = threads.reduce((total, num) => total + num);
        let availableThreads = getTotalThreads(getNetworkAvailableThreads(getTotalAvailableNetwork()));
        // If not enough threads - WAIT.

        while (availableThreads < cycleThreadsRequired) {
            await ns.sleep(30000);
        }
    }

    function getTotalThreads(network) {
        let threads = network.reduce((sum, node) => {
            return sum += node.threads;
        }, 0);
        // Returns thread total from network paramenter.
        return threads;
    }

    // Main attack loop for each script in the cycle.
    async function attackPerScript(attack, target) {
        // Get available servers / threads for each attack.
        const network = getNetworkAvailableThreads(getTotalAvailableNetwork());
        const script = attack.script;
        const threads = attack.threads;

        for (let i = 0; i < network.length; i++) {
            let node = network[i];
            let running = ns.scriptRunning(script, node.name);

            function execScriptPerServer(target, script, node, requiredThreads) {
                // Runs number of threads required on network to complete attack.
                for (let i = requiredThreads; i > 0;) {
                    let threads = i >= node.threads ? node.threads : i;
                    // Executes script on server.
                    execScript(script, node.name, threads, target);
                    i -= threads;
                }
            }

            function execScript(script, node, threads, target) {
                ns.exec(script, node, threads, target);
            }

            //============================
            //===== THREAD FUNCTIONS =====
            //============================

            // Calculate total amount of unused threads on a network.
            function getNetworkAvailableThreads(network) {
                return network.map(node => getNodeAvailableThreads(node)).filter(node => node.threads > 0);
            }

            function getNodeAvailableThreads(node) {
                const name = node;
                const threads = getThreads(ns.getServerMaxRam(node) - ns.getServerUsedRam(node));
                // Returns object with server name and unused threads.
                return {
                    name,
                    threads
                }
            }

            function getThreads(ram) {
                const scriptRam = ns.getScriptRam('weaken.js');
                const threads = (ram - ram % scriptRam) / scriptRam;
                // Returns unused threads based on ram paramenter.
                return threads;
            }

            function getNetworkMaxThreads(network) {
                // Returns array of servers with max threads.
                return network.map(node => getNodeMaxThreads(node));
            }

            function getNodeMaxThreads(node) {
                const name = node;
                const maxRam = ns.getServerMaxRam(node);
                const threads = getMaxThreadsPerScript(maxRam);
                // Returns object with server name and max threads.
                return {
                    name,
                    threads
                }
            }

            function getMaxThreadsPerScript(maxRam) {
                let threads = {};
                for (let script in scripts) {
                    const scriptRam = ns.getScriptRam(scripts[script]);
                    const numOfThreads = (maxRam - maxRam % scriptRam) / scriptRam;
                    threads[script] = numOfThreads;
                }
                // Returns object with number of threads for each script type.
                return threads;
            }

            function getNetworkThreadTotalsPerScript(network) {
                let threads = {};
                for (let script in scripts) {
                    let total = network.reduce((sum, node) => {
                        return sum += node.threads[script];
                    }, 0);
                    threads[script] = total;
                }
                // Returns object with total number of threads on network parameter for each script type.
                return threads;
            }

            //============================
            //===== TARGET FUNCTIONS =====
            //============================

            function getTargets() {
                const targets = getHackableNodes();
                // Returns array of targets sorted by specified statistic.
                return targets.map(node => getTargetStats(node)).sort(compareFn('maxMoney'));
            }

            function getTargetStats(node) {
                const name = node;
                const maxMoney = ns.getServerMaxMoney(node);
                const money = ns.getServerMoneyAvailable(node);
                const success = ns.hackAnalyzeChance(node);
                // Returns object with statistics about server.
                return {
                    name,
                    money,
                    maxMoney,
                    success
                }
            }
        }

        function findScript(target) {
            const moneyThresh = ns.getServerMaxMoney(target) * 0.75;
            const securityThresh = ns.getServerMinSecurityLevel(target) + 5;
            // Returns script name based on statistics.
            if (ns.getServerSecurityLevel(target) > securityThresh) {
                return scripts.weaken;
            } else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
                return scripts.grow;
            } else {
                return scripts.hack;
            }
        }

        function compareFn(compare) {
            // Compare functions for sorting.
            return (a, b) => {
                if (a[compare] < b[compare]) {
                    return -1;
                } else if (a[compare] > b[compare]) {
                    return 1;
                } else {
                    return 0;
                }
            }
        }

        // Main Loop
        while (true) {
            const target = getTargets().pop().name;
            let cycle = 1;
            await mainAttackCycle(target, cycle);
            await ns.sleep(30000);
        }
    }
}
