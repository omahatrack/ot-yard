'use client';

import {useEffect,useRef,useState} from 'react';

export default function QrPanel({equipmentId,partId,code,name}){
  const ref=useRef(null);
  const [err,setErr]=useState('');
  const path=equipmentId?`/equipment/${equipmentId}`:`/parts/${partId}`;

  useEffect(()=>{
    let alive=true;
    import('qrcode')
      .then(m=>m.toCanvas(ref.current,`${window.location.origin}${path}`,{width:220,margin:1}))
      .catch(()=>alive&&setErr('QR library did not load.'));
    return()=>{alive=false};
  },[path]);

  return <div className="qrPanel">
    <div className="printLabel">
      <canvas ref={ref}/>
      <b>{code}</b>
    </div>
    {err?<div className="error">{err}</div>:null}
    <span>{name||'Record'}</span>
    <button className="btn" onClick={()=>window.print()}>Print QR Label</button>
    <small className="muted">QR opens this {equipmentId?'Equipment':'Part'} page.</small>
  </div>;
}
