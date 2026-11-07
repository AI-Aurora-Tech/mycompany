# Essência — Gestão de Perfumaria

Aplicativo web para controle de estoque, vendas e caixa de uma perfumaria.
Feito com React + TypeScript + Vite.

> **Modo demonstração:** por enquanto não há banco de dados. Tudo fica salvo no
> navegador (localStorage). Ao abrir pela primeira vez, o app carrega dados de
> exemplo (14 produtos, 4 vendedores e ~4 meses de vendas). No rodapé do menu há
> as opções **Dados de exemplo** (restaurar) e **Apagar tudo** (começar do zero).

## Como rodar

```bash
npm install
```

```bash
npm run dev
```

Abra o endereço mostrado no terminal (normalmente http://localhost:5173).

Para gerar a versão de produção (pasta `dist/`, pode ser publicada em qualquer hospedagem estática como Vercel ou Netlify):

```bash
npm run build
```

## Telas

| Tela | O que faz |
|---|---|
| **Dashboard** | Valor vendido, ticket médio, itens vendidos, saldo financeiro e estoque; gráfico de vendas por dia/semana/mês; produtos mais vendidos (por quantidade ou valor); origem das vendas (loja física × virtual); formas de pagamento; top vendedores; alertas de estoque baixo. Filtro de período em todas as telas. |
| **Nova venda** | Busca e seleção de produtos (um ou vários), quantidades, origem (Loja Física / Loja Virtual), vendedor (obrigatório na loja física), forma de pagamento (Dinheiro, PIX, Crédito, Débito, Boleto), desconto em R$ ou %, cliente e observação. Ao finalizar: baixa o estoque e lança a entrada no financeiro automaticamente. |
| **Estoque** | Cadastro e edição de produtos (SKU, marca, categoria, ml, custo, preço, estoque mínimo, margem), lançamento de entrada (com opção de lançar a compra no financeiro), remoção com motivo, exclusão de produto e histórico completo de movimentações. |
| **Vendedores** | Ranking com quantidade de vendas, itens, valor vendido, ticket médio e participação; cadastro, edição, ativação/desativação. |
| **Financeiro** | Entradas e saídas com categoria, data e descrição; saldo do período; saídas por categoria. Vendas e estornos entram automaticamente. |
| **Relatório de vendas** | Lista de vendas com origem, forma de pagamento e vendedor; filtros por período, origem, pagamento, vendedor e situação; resumos por origem/pagamento/vendedor; detalhes da venda; cancelamento (devolve estoque e lança estorno); exportação CSV (abre no Excel). |

## Estrutura

```
src/
  data/
    types.ts            modelos (Produto, Venda, Vendedor, Movimentação, Lançamento)
    repository.ts       contrato da camada de dados (o que as telas usam)
    localRepository.ts  implementação atual com localStorage
    seed.ts             dados de demonstração
    store.ts            ponto único de troca da implementação + hook useDB()
  lib/                  formatação (R$, datas), períodos e cálculos dos indicadores
  components/           layout, modal, gráficos, KPIs, avisos
  pages/                uma tela por arquivo
```

## Migração para o Supabase

As telas não acessam o localStorage diretamente: elas usam o contrato
`Repository` (`src/data/repository.ts`), que já é assíncrono. Para migrar:

1. Criar as tabelas abaixo no Supabase.
2. Criar `src/data/supabaseRepository.ts` implementando o mesmo contrato com `@supabase/supabase-js`.
3. Trocar `createLocalRepository` por `createSupabaseRepository` em `src/data/store.ts`.
4. Mover as operações que mexem em várias tabelas (finalizar venda, cancelar venda) para funções no banco (RPC / `plpgsql`), para que estoque, venda e financeiro sejam gravados juntos numa transação.

Esquema sugerido:

```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  brand text,
  category text,
  volume_ml int default 0,
  cost_price numeric(12,2) default 0,
  sale_price numeric(12,2) not null,
  stock int not null default 0,
  min_stock int not null default 0,
  created_at timestamptz default now()
);

create table sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table sales (
  id uuid primary key default gen_random_uuid(),
  number serial unique,
  date timestamptz default now(),
  channel text check (channel in ('loja_fisica','loja_virtual')) not null,
  seller_id uuid references sellers(id),
  payment_method text check (payment_method in ('dinheiro','pix','credito','debito','boleto')) not null,
  subtotal numeric(12,2) not null,
  discount numeric(12,2) default 0,
  total numeric(12,2) not null,
  customer_name text,
  notes text,
  status text check (status in ('concluida','cancelada')) default 'concluida'
);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references sales(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  quantity int not null,
  unit_price numeric(12,2) not null
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  type text check (type in ('entrada','saida','venda','cancelamento')) not null,
  quantity int not null,
  reason text,
  sale_id uuid references sales(id),
  date timestamptz default now()
);

create table finance_entries (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('entrada','saida')) not null,
  category text not null,
  description text,
  amount numeric(12,2) not null,
  sale_id uuid references sales(id),
  date timestamptz default now()
);
```

Também será o momento de adicionar login (Supabase Auth) e permissões por usuário.
