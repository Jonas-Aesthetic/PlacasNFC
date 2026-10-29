const U=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL,T=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;
exports.on=!!(U&&T);
exports.pipe=async(c)=>{const r=await fetch(U+'/pipeline',{method:'POST',headers:{Authorization:'Bearer '+T},body:JSON.stringify(c)});if(!r.ok)throw new Error('redis '+r.status);return(await r.json()).map(x=>{if(x.error)throw new Error(x.error);return x.result})};
