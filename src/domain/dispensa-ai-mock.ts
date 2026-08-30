import type { ContestoDispensa, EsitoCorrezione, ModificaProposta, VoceContesto } from './dispensa-ai';

/**
 * L'interprete deterministico dietro DISPENSA_AI_MOCK=1 (spec §2, ramo 2):
 * serve a sviluppo ed E2E, ed è onestamente stupido — match del nome e
 * quattro regole, nessuno lo scambia per AI. La nota si spezza in frasi su
 * virgole, punti e a-capo; ogni frase o produce una proposta o finisce nei
 * non riconosciuti.
 */
export function mockCorrezione(nota: string, contesto: ContestoDispensa): EsitoCorrezione {
  const proposte: ModificaProposta[] = [];
  const nonRiconosciuti: string[] = [];

  const frasi = nota.split(/[,;.\n]/).map((f) => f.trim()).filter((f) => f.length > 0);
  for (const frase of frasi) {
    const minuscola = frase.toLowerCase();
    const abbinata = abbina(minuscola, contesto);
    const proposta = abbinata && interpretaFrase(minuscola, frase, abbinata);
    if (proposta) proposte.push(proposta);
    else nonRiconosciuti.push(frase);
  }
  return { proposte, nonRiconosciuti };
}

/** Match esatto di una parola col nome → 0.95; nome contenuto nella frase → 0.7. */
function abbina(minuscola: string, contesto: ContestoDispensa): { voce: VoceContesto; confidence: number } | null {
  for (const voce of contesto) {
    const nome = voce.nome.toLowerCase();
    if (!minuscola.includes(nome)) continue;
    const parolaEsatta = new RegExp(`(^|\\s)${nome}($|\\s)`).test(minuscola);
    return { voce, confidence: parolaEsatta ? 0.95 : 0.7 };
  }
  // Secondo giro: la PRIMA PAROLA del nome dell'ingrediente ("olio" per
  // "Olio extravergine") — inclusione, mai match esatto.
  for (const voce of contesto) {
    const prima = voce.nome.toLowerCase().split(/\s+/)[0]!;
    if (prima.length >= 4 && minuscola.includes(prima)) return { voce, confidence: 0.7 };
  }
  return null;
}

function interpretaFrase(
  minuscola: string,
  originale: string,
  abbinata: { voce: VoceContesto; confidence: number },
): ModificaProposta | null {
  const { voce, confidence } = abbinata;
  const base = { ingredientId: voce.id, confidence } as const;

  if (/congelat|freezer/.test(minuscola)) {
    return {
      ...base, campo: 'congelato', valoreNuovo: true, valoreAttuale: voce.congelato,
      motivazione: `«${originale}» → nel congelatore`,
    };
  }
  if (/finit/.test(minuscola)) {
    return {
      ...base, campo: 'residuo', valoreNuovo: 0, valoreAttuale: voce.residuo,
      motivazione: `«${originale}» → 0 ${voce.unitaBase}`,
    };
  }
  if (/a metà/.test(minuscola)) {
    const valore = voce.formatoConfezione * 0.5;
    return {
      ...base, campo: 'residuo', valoreNuovo: valore, valoreAttuale: voce.residuo,
      motivazione: `«${originale}» → ${valore} di ${voce.formatoConfezione} ${voce.unitaBase}`,
    };
  }
  const confezioni = minuscola.match(/(\d+)\s*confezion/);
  if (confezioni) {
    const n = Number(confezioni[1]);
    return {
      ...base, campo: 'residuo', valoreNuovo: voce.formatoConfezione * n, valoreAttuale: voce.residuo,
      motivazione: `«${originale}» → ${n} × ${voce.formatoConfezione} ${voce.unitaBase}`,
    };
  }
  return null;
}
