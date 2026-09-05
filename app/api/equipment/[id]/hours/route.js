import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireApiUser,userCanAccessLocation } from '../../../../../lib/session';

function redirectTo(path){ return new NextResponse(null,{status:303,headers:{Location:path}}); }

export async function POST(req,{params}){
  const auth=await requireApiUser(['Admin','Mechanic']);
  if(auth.error)return NextResponse.json({error:auth.error},{status:auth.status});
  const id=Number(params.id);
  if(!Number.isInteger(id))return NextResponse.json({error:'Invalid equipment ID.'},{status:400});
  const equipment=await prisma.equipment.findUnique({where:{id}});
  if(!equipment)return NextResponse.json({error:'Equipment not found.'},{status:404});
  if(!userCanAccessLocation(auth.user,equipment.locationId,['Admin','Mechanic']))return NextResponse.json({error:'Location access denied.'},{status:403});
  const form=await req.formData();
  const hours=Number(form.get('hours'));
  if(!Number.isFinite(hours)||hours<0)return NextResponse.json({error:'Enter valid machine hours.'},{status:400});
  if(Number(equipment.currentHours)!==hours){
    await prisma.$transaction(async tx=>{
      await tx.equipment.update({where:{id},data:{currentHours:hours}});
      await tx.machineHoursLog.create({data:{equipmentId:id,hours,userId:auth.user.id}});
    });
  }
  return redirectTo(`/equipment/${id}`);
}
