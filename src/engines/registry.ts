import { readWorkbook } from './core/table';
import { EngineBlockError, type EngineResult } from './core/types';
import { processProdutos } from './produtos/process';

export type EngineRunner = {
  /** Coluna que identifica cada linha da base. */
  keyColumn: string;
  /** Lê os arquivos (por id de slot) e devolve a base. */
  run: (files: Record<string, File>) => Promise<EngineResult>;
};

function need(files: Record<string, File>, slot: string): File {
  const file = files[slot];
  if (!file)
    throw new EngineBlockError(
      `arquivo não enviado nesta sessão (${slot}): envie novamente os arquivos para reprocessar`,
    );
  return file;
}

async function bytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** Motores já ligados ao processamento real. Os demais continuam só com o envio de arquivos. */
export const runners: Record<string, EngineRunner> = {
  produtos: {
    keyColumn: 'ean',
    run: async (files) => {
      const itens = readWorkbook(await bytes(need(files, '286')));
      const logistico = readWorkbook(await bytes(need(files, '8013')));
      const lista = readWorkbook(
        await bytes(need(files, 'lista-preco-industria')),
      );
      const precos = readWorkbook(await bytes(need(files, '8011')));
      const sortimento = readWorkbook(
        await bytes(need(files, 'sortimento-nacional')),
      );
      const text322 = new TextDecoder('windows-1252').decode(
        await need(files, '322').arrayBuffer(),
      );
      return processProdutos({
        itens286: itens.sheetWith(['Código', 'Cód. Barras', 'Custo real']),
        texto322: text322,
        logistico8013: logistico.sheetWith(['SUB BRANDS']),
        listaPreco: lista.sheetWith(['SKU', 'PRECO BASE'], 'data'),
        precos8011: precos.sheetWith(['CODPROD', 'PRECO']),
        sortimento: sortimento.sheetWith(
          ['STATUS', 'COD', 'EAN'],
          'Base_Sortimento_Nacional',
        ),
      });
    },
  },
};
