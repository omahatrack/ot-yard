import {NextResponse} from 'next/server';
import {sql} from '../../../../lib/db';
import {getCurrentUser,userCanAccessLocation} from '../../../../lib/session';
import {requireApiUser} from '../../../../lib/apiAuth';

function safeName(name){return String(name||'service-document').replace(/[\r\n"\\]/g,'_')}
export async function GET(_req,{params}){
  const id=Number(params.id),user=await getCurrentUser();
  if(!user)return new Response('Unauthorized',{status:401});
  const rows=await sql(`SELECT a.mimeType,a.fileName,a.data,e.locationId FROM ServiceAttachment a JOIN ServiceRecord r ON r.id=a.serviceRecordId JOIN Equipment e ON e.id=r.equipmentId WHERE a.id=? LIMIT 1`,[id]);
  if(!rows.length||!userCanAccessLocation(user,Number(rows[0].locationId)))return new Response('Not found',{status:404});
  const r=rows[0];
  return new Response(r.data,{status:200,headers:{'Content-Type':r.mimeType,'Content-Length':String(r.data.length),'Content-Disposition':`inline; filename="${safeName(r.fileName)}"`,'Cache-Control':'private, max-age=300'}});
}
export async function DELETE(_req,{params}){
  const a=await requireApiUser(['Admin','Mechanic']);
  if(a.error)return NextResponse.json({error:a.error},{status:a.status});
  const id=Number(params.id);
  const rows=await sql(`SELECT e.locationId FROM ServiceAttachment a JOIN ServiceRecord r ON r.id=a.serviceRecordId JOIN Equipment e ON e.id=r.equipmentId WHERE a.id=? LIMIT 1`,[id]);
  if(!rows.length)return NextResponse.json({error:'Not found'},{status:404});
  if(!userCanAccessLocation(a.user,Number(rows[0].locationId),['Admin','Mechanic']))return NextResponse.json({error:'Location access denied.'},{status:403});
  await sql('DELETE FROM ServiceAttachment WHERE id=?',[id]);
  return NextResponse.json({ok:true});
}
