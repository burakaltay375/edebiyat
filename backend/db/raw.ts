import {env} from "cloudflare:workers";
export function db(){if(!env.DB)throw new Error("Veritabanına ulaşılamıyor.");return env.DB;}
