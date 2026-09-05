import AppShell from '../../components/AppShell';
import { prisma } from '../../lib/prisma';
import { getCurrentUser } from '../../lib/session';
import { sql } from '../../lib/db';

export const dynamic='force-dynamic';

export default async function Dashboard(){
  const user=await getCurrentUser();
  const locationId=user?.locationId;
  const stockWhere=locationId?{locationId}:{};
  const [reorder,onorder,check,recent,equipmentRows]=await Promise.all([
    prisma.partLocationInventory.count({where:{...stockWhere,status:'needs_reorder'}}),
    prisma.partLocationInventory.count({where:{...stockWhere,status:'on_order'}}),
    prisma.partLocationInventory.count({where:{...stockWhere,status:'check'}}),
    prisma.inventoryTransaction.findMany({where:locationId?{locationId}:{},include:{part:true,user:true,equipment:true},orderBy:{createdAt:'desc'},take:8}),
    locationId
      ? sql(`SELECT id,code,displayName,currentHours FROM Equipment WHERE locationId=? AND UPPER(TRIM(COALESCE(status,''))) <> 'ARCHIVED' ORDER BY code ASC`,[locationId])
      : sql(`SELECT id,code,displayName,currentHours FROM Equipment WHERE UPPER(TRIM(COALESCE(status,''))) <> 'ARCHIVED' ORDER BY code ASC`)
  ]);
  const equipment=equipmentRows||[];
  const equipmentCount=equipment.length;

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
  </AppShell>;
}
