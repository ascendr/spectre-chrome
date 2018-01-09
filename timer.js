function worker_function(){

self.onmessage = function(event)
{
    const sharedBuffer = event.data;
    const sharedArray = new Uint32Array(sharedBuffer);
    postMessage('start');
    while(true)
    {
        Atomics.add(sharedArray,0,1);
    }
};
}

if(window!=self)
  worker_function();