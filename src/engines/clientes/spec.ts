import type { ColumnSpec } from '../core/types';

/** Colunas da base de Clientes (grupo, nome e origem de cada campo). */
export const SPEC: ColumnSpec[] = [
  {
    group: 'Identificação',
    name: 'cnpj_cpf',
    source:
      '1203: CPF/CNPJ; pirâmide: COD CLIENTE (só dígitos; CPF com 11 e CNPJ com 14 dígitos, zeros à esquerda repostos)',
  },
  {
    group: 'Identificação',
    name: 'tipo_doc',
    source: 'CNPJ ou CPF, pelo tamanho do documento',
  },
  {
    group: 'Identificação',
    name: 'cod_cliente',
    source: '1203: Código (código do cliente no Winthor)',
  },
  {
    group: 'Identificação',
    name: 'nome',
    source:
      '1203: Nome; carteira: Cliente; pirâmide: NOME_CLIENTE (vale o mais completo)',
  },
  {
    group: 'Identificação',
    name: 'fantasia',
    source: '1203: Fantasia; senão carteira: Fantasia',
  },
  {
    group: 'Localização',
    name: 'cidade',
    source: '1203: Município; senão carteira: Cidade; senão pirâmide: CIDADE',
  },
  {
    group: 'Localização',
    name: 'bairro',
    source: 'Carteira: Bairro',
  },
  {
    group: 'Localização',
    name: 'endereco',
    source: 'Carteira: Endereço',
  },
  {
    group: 'Localização',
    name: 'latitude',
    source: 'Carteira: Latitude',
  },
  {
    group: 'Localização',
    name: 'longitude',
    source: 'Carteira: Longitude',
  },
  {
    group: 'Cadastro',
    name: 'cobranca',
    source: '1203: Cobrança',
  },
  {
    group: 'Cadastro',
    name: 'atividade_cod',
    source:
      'Carteira: Atividade Comercial (código; sem descrição nos arquivos)',
  },
  {
    group: 'Cadastro',
    name: 'telefone',
    source: 'Carteira: Telefone (só dígitos; 0 vira vazio)',
  },
  {
    group: 'Cadastro',
    name: 'dt_vencto_limite_credito',
    source: '1203: Dt. vencto lim. créd',
  },
  {
    group: 'Cadastro',
    name: 'dt_ult_consulta_serasa',
    source: '1203: Dt. Ult. Consulta Serasa',
  },
  {
    group: 'Cadastro',
    name: 'cod_rca_1203',
    source: '1203: Cód. RCA (como vem; 2 = venda indústrias, sem vendedor)',
  },
  {
    group: 'Cadastro',
    name: 'rca_1203',
    source: '1203: RCA',
  },
  {
    group: 'Cadastro',
    name: 'cod_supervisor_1203',
    source: '1203: Cód. supervisor',
  },
  {
    group: 'Cadastro',
    name: 'supervisor_1203',
    source: '1203: Supervisor',
  },
  {
    group: 'Carteira',
    name: 'em_carteira_colgate',
    source:
      'SIM se o cliente aparece na carteira (relatório dos vendedores Colgate); não diz qual vendedor',
  },
  {
    group: 'Carteira',
    name: 'dias_sem_comprar',
    source:
      'Carteira: Dias Sem Comprar (número; "Cliente sem Compra" vira vazio)',
  },
  {
    group: 'Pirâmide',
    name: 'na_piramide',
    source: 'SIM se o CNPJ está na aba Pirâmide ativa',
  },
  {
    group: 'Pirâmide',
    name: 'faixa',
    source: 'Pirâmide: FAIXAS',
  },
  {
    group: 'Pirâmide',
    name: 'perfil',
    source: 'Pirâmide: PERFIL',
  },
  {
    group: 'Pirâmide',
    name: 'ambiente',
    source: 'Pirâmide: AMBIENTE',
  },
  {
    group: 'Pirâmide',
    name: 'cluster_cod',
    source: 'Pirâmide: IND_CLUSTER_COD',
  },
  {
    group: 'Pirâmide',
    name: 'cluster_desc',
    source: 'Pirâmide: IND_CLUSTER_DESC',
  },
  {
    group: 'Pirâmide',
    name: 'rede',
    source: 'Pirâmide: REDE',
  },
  {
    group: 'Pirâmide',
    name: 'area_nielsen',
    source: 'Pirâmide: AREA NIELSEN',
  },
  {
    group: 'Pirâmide',
    name: 'check_pdv',
    source: 'Pirâmide: CHECK PDV',
  },
  {
    group: 'Pirâmide',
    name: 'venda_3_meses',
    source: 'Pirâmide: Ult. 3 meses',
  },
  {
    group: 'Status',
    name: 'cadastrado_1203',
    source: 'SIM se o cliente existe no 1203; NAO se só está na pirâmide',
  },
  {
    group: 'Origem',
    name: 'orig_cadastro',
    source: 'arquivo do cadastro (vazio se o cliente não está no 1203)',
  },
  {
    group: 'Origem',
    name: 'orig_carteira',
    source: 'arquivo da carteira (vazio se não está)',
  },
  {
    group: 'Origem',
    name: 'orig_piramide',
    source: 'arquivo da pirâmide (vazio se não está)',
  },
];
