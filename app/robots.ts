import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base=(process.env.APP_BASE_URL||process.env.NEXT_PUBLIC_APP_URL||"https://stroyselect.ru").replace(/\/$/,"");
  return {
    rules:[
      {userAgent:"*",allow:["/","/contractors","/contractors/","/services/","/legal/"],disallow:["/admin/","/customer/","/contractor/","/api/","/dashboard","/notification-settings"]},
    ],
    sitemap:`${base}/sitemap.xml`,
    host:base,
  };
}
