import {NextResponse} from 'next/server';
function publicUrl(req,path='/'){
  const host=(req.headers.get('x-forwarded-host')||req.headers.get('host')||'').split(',')[0].trim();
  const proto=(req.headers.get('x-forwarded-proto')||'https').split(',')[0].trim();
  if(host)return new URL(path,`${proto}://${host}`);
  const url=req.nextUrl.clone();url.pathname=path;url.search='';return url;
}
export function middleware(req){const p=req.nextUrl.pathname;if(p==='/'||p==='/forgot-password'||p==='/reset-password'||p.startsWith('/api/auth')||p.startsWith('/_next')||p.startsWith('/img'))return NextResponse.next();if(!req.cookies.get('ot_session'))return NextResponse.redirect(publicUrl(req,'/'));return NextResponse.next()}
export const config={matcher:['/((?!favicon.ico).*)']};
