import AppShell from '../../components/AppShell';
import { prisma } from '../../lib/prisma';
import { getCurrentUser } from '../../lib/session';
import { sql } from '../../lib/db';
import { getServiceStatus } from '../../lib/serviceStatus';

export const dynamic='force-dynamic';

function serviceRemaining(status){
  const parts=[];
  if(status.remainingHours!=null){
    const hrs=Math.round(Math.abs(status.remainingHours));
    parts.push(status.remainingHours<0?`${hrs.toLocaleString()} hrs overdue`:`${hrs.toLocaleString()} hrs remaining`);
  }
  if(status.remainingDays!=null){
    const days=Math.abs(status.remainingDays);
    parts.push(status.remainingDays<0?`${days.toLocaleString()} days overdue`:`${days.toLocaleString()} days remaining`);
  }
  return parts.join(' • ')||'Due threshold reached';
}

export default async function Dashboard(){
  const user=await getCurrentUser();
  const locationId=user?.locationId;
  const stockWhere=locationId?{locationId}:{};
  const [reorder,onorder,check,recent,equipmentRows,serviceIntervals]=await Promise.all([
    prisma.partLocationInventory.count({where:{...stockWhere,status:'needs_reorder'}}),
    prisma.partLocationInventory.count({where:{...stockWhere,status:'on_order'}}),
    prisma.partLocationInventory.count({where:{...stockWhere,status:'check'}}),
    prisma.inventoryTransaction.findMany({where:locationId?{locationId}:{},include:{part:true,user:true,equipment:true},orderBy:{createdAt:'desc'},take:8}),
    locationId
      ? sql(`SELECT id,code,displayName,currentHours FROM Equipment WHERE locationId=? AND UPPER(TRIM(COALESCE(status,''))) <> 'ARCHIVED' ORDER BY code ASC`,[locationId])
      : sql(`SELECT id,code,displayName,currentHours FROM Equipment WHERE UPPER(TRIM(COALESCE(status,''))) <> 'ARCHIVED' ORDER BY code ASC`),
    prisma.serviceInterval.findMany({
      where:{equipmentId:{not:null}},
      include:{equipment:true},
      orderBy:{id:'asc'}
    })
  ]);
  const equipment=equipmentRows||[];
  const equipmentCount=equipment.length;
  const neededService=serviceIntervals
    .filter(i=>i.equipment && String(i.equipment.status||'').trim().toUpperCase()!=='ARCHIVED' && (!locationId || Number(i.equipment.locationId)===Number(locationId)))
    .map(i=>({interval:i,equipment:i.equipment,status:getServiceStatus(i,Number(i.equipment.currentHours||0))}))
    .filter(x=>x.status.key==='overdue'||x.status.key==='due_soon')
    .sort((a,b)=>{
      if(a.status.key!==b.status.key)return a.status.key==='overdue'?-1:1;
      const av=a.status.remainingHours??a.status.remainingDays??Number.POSITIVE_INFINITY;
      const bv=b.status.remainingHours??b.status.remainingDays??Number.POSITIVE_INFINITY;
      return av-bv;
    });

  return <AppShell title="Dashboard Overview" active="Dashboard">
    <div className="grid4 dashboardMetrics">
      <div className="metric metricReorder">
        <div className="metricCopy"><small>Needs Reorder</small><strong>{reorder}</strong></div>
        <div className="metricIcon" aria-hidden="true">!</div>
      </div>
      <div className="metric metricOrder">
        <div className="metricCopy"><small>On Order</small><strong>{onorder}</strong></div>
        <div className="metricIcon metricIconClipboard" aria-hidden="true">✓</div>
      </div>
      <div className="metric metricCheck">
        <div className="metricCopy"><small>Check Inventory</small><strong>{check}</strong></div>
        <div className="metricIcon metricIconClipboard" aria-hidden="true">✓</div>
      </div>
      <div className="metric metricEquipment">
        <div className="metricCopy"><small>Equipment</small><strong>{equipmentCount}</strong></div>
        <div className="metricIcon metricIconEquipment" aria-hidden="true">▣</div>
      </div>
    </div>
    <div className="cols">
      <section className="card"><h2>Equipment</h2><div className="tablewrap"><table><thead><tr><th>Unit</th><th>Description</th><th>Hours</th></tr></thead><tbody>{equipment.map(e=><tr key={e.id}><td><a href={`/equipment/${e.id}`}><b>{e.code}</b></a></td><td>{e.displayName||'—'}</td><td>{e.currentHours}</td></tr>)}</tbody></table></div></section>
      <section className="card"><h2>Recent Inventory Activity</h2><div className="tablewrap"><table><tbody>{recent.map(t=><tr key={t.id}><td><b>{t.part.internalPartNumber}</b><div className="muted">{t.type} {t.qtyDelta>0?'+':''}{t.qtyDelta}{t.equipment?` • ${t.equipment.code}`:''}</div></td><td>{t.user?.name||'System'}</td></tr>)}</tbody></table></div></section>
    </div>
    <section className="card dashboardServiceCard" style={{marginTop:18}}>
      <div className="toolbar dashboardServiceHeader"><div><h2>Needed Service</h2><div className="muted">Overdue service and equipment within 100 hours (or 30 days) of its next configured service.</div></div><a className="textLink" href="/service">View Service</a></div>
      <div className="tablewrap"><table><thead><tr><th>Unit</th><th>Service</th><th>Current</th><th>Interval</th><th>Status</th><th>Due</th></tr></thead><tbody>
        {neededService.length?neededService.map(({interval,equipment,status})=><tr key={interval.id} className={`dashboardServiceRow ${status.key}`}>
          <td><a className="tableLink" href={`/equipment/${equipment.id}`}><b>{equipment.code}</b></a><div className="muted">{equipment.displayName||'Equipment'}</div></td>
          <td><b>{interval.description}</b></td>
          <td>{Number(equipment.currentHours||0).toLocaleString()} hrs</td>
          <td>{interval.hoursValue?`${interval.hoursValue.toLocaleString()} hrs`:''}{interval.hoursValue&&interval.daysValue?' • ':''}{interval.daysValue?`${interval.daysValue.toLocaleString()} days`:''}</td>
          <td><span className={`serviceDashboardBadge ${status.key}`}>{status.label}</span></td>
          <td>{serviceRemaining(status)}</td>
        </tr>):<tr><td colSpan="6" className="emptyCell"><b>No service due within 100 hours.</b><div className="muted">Configured service intervals are currently outside the advance-warning window.</div></td></tr>}
      </tbody></table></div>
    </section>
  </AppShell>;
}
