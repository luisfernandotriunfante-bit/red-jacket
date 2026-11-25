import { readWorkbook } from './core/table';
import {
  EngineBlockError,
  type BaseRow,
  type EngineResult,
} from './core/types';
import { processClientes } from './clientes/process';
import { processCortes } from './cortes/process';
import { processRoteiro } from './roteiro/process';
import { processProdutos } from './produtos/process';

export type EngineRunner = {
  /** Coluna que identifica cada linha da base. */
  keyColumn: string;
  /** Motores cuja base vigente este motor precisa (ex.: Cortes usa Produtos e Clientes). */
  needs?: string[];
  /** Lê os arquivos (por id de slot) e devolve a base. */
  run: (
    files: Record<string, File>,
    bases: Record<string, BaseRow[]>,
  ) => Promise<EngineResult>;
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
  clientes: {
    keyColumn: 'cnpj_cpf',
    run: async (files) => {
      const cadastro = readWorkbook(await bytes(need(files, '1203')));
      const carteira = readWorkbook(
        await bytes(need(files, 'carteira-clientes')),
      );
      const piramide = readWorkbook(await bytes(need(files, 'piramide')));
      return processClientes(
        {
          cadastro1203: cadastro.sheetWith(['Código', 'CPF/CNPJ', 'Nome']),
          carteira: carteira.sheet(),
          piramide: piramide.sheetWith(
            ['COD CLIENTE', 'FAIXAS', 'PERFIL'],
            'Pirâmide ativa',
          ),
        },
        {
          cadastro: '1203-clientes.xls',
          carteira: 'relatorio_carteira_clientes.xls',
          piramide: 'piramide (aba Pirâmide ativa)',
        },
      );
    },
  },
  cortes: {
    keyColumn: 'id_corte',
    needs: ['produtos', 'clientes'],
    run: async (files, bases) => {
      const produtos = bases.produtos ?? [];
      const clientes = bases.clientes ?? [];
      if (!produtos.length)
        throw new EngineBlockError(
          'a base de Produtos está vazia: processe o motor Produtos antes',
        );
      if (!clientes.length)
        throw new EngineBlockError(
          'a base de Clientes está vazia: processe o motor Clientes antes',
        );
      const arquivos = [];
      for (const [slot, nome] of [
        ['1454-agosto', '1454 de agosto em diante'],
        ['1454-atual', '1454 do mês atual'],
      ] as const) {
        const wb = readWorkbook(await bytes(need(files, slot)), {
          serialDates: true,
        });
        arquivos.push({ nome, matrix: wb.sheet() });
      }
      return processCortes({ arquivos, produtos, clientes });
    },
  },
  roteiro: {
    keyColumn: 'id_visita',
    needs: ['clientes'],
    run: async (files, bases) => {
      const wb = readWorkbook(await bytes(need(files, 'roteiro-consolidado')));
      return processRoteiro({
        matrix: wb.sheet(),
        clientes: bases.clientes ?? [],
      });
    },
  },
};
