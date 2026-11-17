'use client';
import { useEffect, useState } from 'react';
import { useVeiculos } from '@/store/veiculos';
import {
  listarMarcas,
  listarModelos,
  listarAnos,
  consultarValor,
  precoFipeParaNumero,
  normalizarCombustivel,
  type FipeMarca,
  type FipeModelo,
  type FipeAno,
} from '@/lib/fipe';
import { estimarConsumo } from '@/lib/consumo';
import type { CategoriaVeiculo, TipoCombustivel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Car,
  Plus,
  Check,
  Trash2,
  Fuel,
  Loader2,
  Pencil,
  Star,
} from 'lucide-react';

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CATEGORIAS: CategoriaVeiculo[] = [
  'Popular',
  'Hatch',
  'Sedã',
  'SUV',
  'Picape',
  'Executivo',
];

/** Fator de rendimento do etanol em relação à gasolina */
const FATOR_ETANOL = 0.7;

export default function VeiculoPage() {
  const { veiculos, ativoId, adicionar, atualizar, remover, definirAtivo } =
    useVeiculos();

  const [abrindo, setAbrindo] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [marcas, setMarcas] = useState<FipeMarca[]>([]);
  const [modelos, setModelos] = useState<FipeModelo[]>([]);
  const [anos, setAnos] = useState<FipeAno[]>([]);
  const [carregandoMarcas, setCarregandoMarcas] = useState(false);
  const [carregandoModelos, setCarregandoModelos] = useState(false);
  const [carregandoAnos, setCarregandoAnos] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [erroFipe, setErroFipe] = useState<string | null>(null);

  const [marcaCodigo, setMarcaCodigo] = useState('');
  const [modeloCodigo, setModeloCodigo] = useState('');
  const [anoCodigo, setAnoCodigo] = useState('');

  const [apelido, setApelido] = useState('');
  const [categoria, setCategoria] = useState<CategoriaVeiculo>('Executivo');
  const [valorFipe, setValorFipe] = useState('');
  const [consumo, setConsumo] = useState('');
  const [consumoEtanol, setConsumoEtanol] = useState('');
  const [consumoEstimado, setConsumoEstimado] = useState(true);
  const [kmPorMes, setKmPorMes] = useState('3000');
  const [valorRevenda, setValorRevenda] = useState('');
  const [combustivel, setCombustivel] = useState<TipoCombustivel>('Flex');
  const [modeloNome, setModeloNome] = useState('');
  const [anoNumero, setAnoNumero] = useState<number | null>(null);

  useEffect(() => {
    if (!abrindo || marcas.length > 0) return;
    setCarregandoMarcas(true);
    setErroFipe(null);
    listarMarcas()
      .then(setMarcas)
      .catch(() => setErroFipe('Não foi possível carregar a FIPE.'))
      .finally(() => setCarregandoMarcas(false));
  }, [abrindo, marcas.length]);

  const escolherMarca = async (codigo: string) => {
    setMarcaCodigo(codigo);
    setModeloCodigo('');
    setAnoCodigo('');
    setModelos([]);
    setAnos([]);
    if (!codigo) return;
    setCarregandoModelos(true);
    try {
      setModelos(await listarModelos(codigo));
    } catch {
      setErroFipe('Não foi possível carregar os modelos.');
    } finally {
      setCarregandoModelos(false);
    }
  };

  const escolherModelo = async (codigo: string) => {
    setModeloCodigo(codigo);
    setAnoCodigo('');
    setAnos([]);
    const modelo = modelos.find((m) => m.codigo === codigo);
    setModeloNome(modelo?.nome ?? '');
    if (!codigo) return;
    const est = estimarConsumo(modelo?.nome ?? '', categoria, combustivel);
    setConsumo(String(est.kmPorLitro).replace('.', ','));
    setConsumoEtanol(
      String((est.kmPorLitro * FATOR_ETANOL).toFixed(1)).replace('.', ','),
    );
    setConsumoEstimado(true);
    setCarregandoAnos(true);
    try {
      setAnos(await listarAnos(marcaCodigo, codigo));
    } catch {
      setErroFipe('Não foi possível carregar os anos.');
    } finally {
      setCarregandoAnos(false);
    }
  };

  const escolherAno = async (codigo: string) => {
    setAnoCodigo(codigo);
    if (!codigo) return;
    const ano = anos.find((a) => a.codigo === codigo);
    const numAno = Number(ano?.nome?.match(/\d{4}/)?.[0] ?? 0);
    setAnoNumero(numAno || null);
    setConsultando(true);
    try {
      const valor = await consultarValor(marcaCodigo, modeloCodigo, codigo);
      const preco = precoFipeParaNumero(valor.valor);
      setValorFipe(String(preco));
      setValorRevenda(String(Math.round(preco * 0.75)));
      const comb = normalizarCombustivel(valor.combustivel);
      setCombustivel(comb);
      const est = estimarConsumo(modeloNome, categoria, comb);
      setConsumo(String(est.kmPorLitro).replace('.', ','));
      setConsumoEtanol(
        String((est.kmPorLitro * FATOR_ETANOL).toFixed(1)).replace('.', ','),
      );
      setConsumoEstimado(true);
      if (!apelido) {
        setApelido(`${modeloNome.split(' ')[0]} ${numAno || ''}`.trim());
      }
    } catch {
      setErroFipe('Não foi possível consultar o valor FIPE.');
    } finally {
      setConsultando(false);
    }
  };

  const limparForm = () => {
    setMarcaCodigo('');
    setModeloCodigo('');
    setAnoCodigo('');
    setApelido('');
    setValorFipe('');
    setConsumo('');
    setConsumoEtanol('');
    setValorRevenda('');
    setKmPorMes('3000');
    setModeloNome('');
    setAnoNumero(null);
    setEditandoId(null);
    setErroFipe(null);
    setConsumoEstimado(true);
  };

  const salvar = () => {
    const num = (s: string) => Number(s.replace(',', '.')) || 0;

    // Só guarda o consumo de etanol quando o carro aceita etanol
    const aceitaEtanol = combustivel === 'Flex' || combustivel === 'Etanol';
    const etanolNum = aceitaEtanol ? num(consumoEtanol) : 0;

    if (!editandoId) {
      adicionar({
        carroId: `${marcaCodigo}-${modeloCodigo}-${anoCodigo}`,
        marca: marcas.find((m) => m.codigo === marcaCodigo)?.nome ?? '',
        modelo: modeloNome,
        ano: anoNumero,
        versao: modeloNome,
        combustivel,
        consumo: num(consumo),
        consumoEtanol: etanolNum > 0 ? etanolNum : undefined,
        valorFipe: num(valorFipe),
        valorRevendaEsperado:
          num(valorRevenda) || Math.round(num(valorFipe) * 0.75),
        kmPrevistosAteRevenda: 120000,
        kmAtual: 0,
        kmPorMes: num(kmPorMes) || 3000,
        proprio: true,
        apelido: apelido || modeloNome || 'Veículo',
        consumoEstimado,
        categoria,
      });
      setAbrindo(false);
      limparForm();
      return;
    }

    atualizar(editandoId, {
      consumo: num(consumo),
      consumoEtanol: etanolNum > 0 ? etanolNum : undefined,
      valorFipe: num(valorFipe),
      valorRevendaEsperado: num(valorRevenda),
      kmPorMes: num(kmPorMes) || 3000,
      apelido: apelido || modeloNome || 'Veículo',
      categoria,
      combustivel,
      consumoEstimado,
    });
    setAbrindo(false);
    limparForm();
  };

  const editar = (id: string) => {
    const v = veiculos.find((x) => x.id === id);
    if (!v) return;
    setEditandoId(id);
    setApelido(v.apelido);
    setValorFipe(String(v.valorFipe));
    setConsumo(String(v.consumo).replace('.', ','));
    setConsumoEtanol(
      v.consumoEtanol
        ? String(v.consumoEtanol).replace('.', ',')
        : String((v.consumo * FATOR_ETANOL).toFixed(1)).replace('.', ','),
    );
    setValorRevenda(String(v.valorRevendaEsperado));
    setKmPorMes(String(v.kmPorMes));
    setCategoria(v.categoria);
    setCombustivel(v.combustivel);
    setConsumoEstimado(v.consumoEstimado);
    setModeloNome(v.modelo);
    setAnoNumero(v.ano);
    setAbrindo(true);
  };

  const pronto = !!valorFipe && Number(valorFipe.replace(',', '.')) > 0;
  const aceitaEtanol = combustivel === 'Flex' || combustivel === 'Etanol';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus veículos</h1>
          <p className="text-xs text-muted-foreground">
            {veiculos.length === 0
              ? 'Nenhum veículo cadastrado'
              : `${veiculos.length} veículo${veiculos.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            limparForm();
            setAbrindo((v) => !v);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Novo
        </Button>
      </div>

      {veiculos.map((v) => {
        const ativo = v.id === ativoId;
        return (
          <Card
            key={v.id}
            className={ativo ? 'border-primary/50 bg-primary/5' : ''}
          >
            <CardContent className="space-y-2 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{v.apelido}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.marca} {v.modelo} {v.ano ?? ''}
                  </p>
                </div>
                {ativo && (
                  <Badge className="text-[10px]">
                    <Star className="mr-1 h-3 w-3" /> Ativo
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Fuel className="h-3 w-3" /> {v.consumo.toFixed(1)} km/l
                  {v.consumoEstimado && ' (est.)'}
                </span>
                {v.combustivel === 'Flex' && (
                  <span>
                    Etanol{' '}
                    {(v.consumoEtanol ?? v.consumo * FATOR_ETANOL)
                      .toFixed(1)
                      .replace('.', ',')}{' '}
                    km/l
                  </span>
                )}
                <span>{v.combustivel}</span>
                <span>FIPE {brl(v.valorFipe)}</span>
                <span>{v.kmPorMes.toLocaleString('pt-BR')} km/mês</span>
              </div>
              <div className="flex gap-2 pt-1">
                {!ativo && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => definirAtivo(v.id)}
                  >
                    <Check className="mr-1 h-3 w-3" /> Usar este
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => editar(v.id)}
                >
                  <Pencil className="mr-1 h-3 w-3" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive"
                  onClick={() => remover(v.id)}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {veiculos.length === 0 && !abrindo && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Toque em <strong>Novo</strong> para cadastrar seu carro.
            <br />
            Marca, modelo, ano e valor FIPE vêm automáticos.
          </CardContent>
        </Card>
      )}

      {abrindo && (
        <Card className="border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {editandoId ? 'Editar veículo' : 'Novo veículo'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!editandoId && (
              <>
                <div>
                  <Label className="text-xs">Marca</Label>
                  <select
                    value={marcaCodigo}
                    onChange={(e) => escolherMarca(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">
                      {carregandoMarcas ? 'Carregando...' : 'Selecione'}
                    </option>
                    {marcas.map((m) => (
                      <option key={m.codigo} value={m.codigo}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Modelo</Label>
                  <select
                    value={modeloCodigo}
                    onChange={(e) => escolherModelo(e.target.value)}
                    disabled={!marcaCodigo}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">
                      {carregandoModelos ? 'Carregando...' : 'Selecione'}
                    </option>
                    {modelos.map((m) => (
                      <option key={m.codigo} value={m.codigo}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Ano</Label>
                  <select
                    value={anoCodigo}
                    onChange={(e) => escolherAno(e.target.value)}
                    disabled={!modeloCodigo}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">
                      {carregandoAnos ? 'Carregando...' : 'Selecione'}
                    </option>
                    {anos.map((a) => (
                      <option key={a.codigo} value={a.codigo}>
                        {a.nome}
                      </option>
                    ))}
                  </select>
                </div>
                {consultando && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Consultando valor FIPE...
                  </p>
                )}
              </>
            )}

            {editandoId && (
              <p className="rounded-md bg-muted/50 p-2 text-xs">
                {veiculos.find((v) => v.id === editandoId)?.marca} {modeloNome}{' '}
                {anoNumero ?? ''}
              </p>
            )}

            {erroFipe && (
              <p className="rounded-md border border-destructive/50 bg-destructive/5 p-2 text-xs text-destructive">
                {erroFipe} Você pode preencher os valores manualmente.
              </p>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Apelido</Label>
                <Input
                  value={apelido}
                  onChange={(e) => setApelido(e.target.value)}
                  placeholder="Meu carro"
                />
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <select
                  value={categoria}
                  onChange={(e) =>
                    setCategoria(e.target.value as CategoriaVeiculo)
                  }
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Combustível</Label>
                <select
                  value={combustivel}
                  onChange={(e) =>
                    setCombustivel(e.target.value as TipoCombustivel)
                  }
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {(
                    [
                      'Gasolina',
                      'Etanol',
                      'Flex',
                      'Diesel',
                      'GNV',
                      'Híbrido',
                    ] as TipoCombustivel[]
                  ).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Valor FIPE (R$)</Label>
                <Input
                  inputMode="numeric"
                  value={valorFipe}
                  onChange={(e) => setValorFipe(e.target.value)}
                  placeholder="118000"
                />
              </div>
              <div>
                <Label className="text-xs">
                  Consumo{' '}
                  {aceitaEtanol && combustivel === 'Flex'
                    ? '(gasolina) '
                    : ''}
                  (km/l){' '}
                  {consumoEstimado && (
                    <Badge variant="secondary" className="ml-1 text-[9px]">
                      estimado
                    </Badge>
                  )}
                </Label>
                <Input
                  inputMode="decimal"
                  value={consumo}
                  onChange={(e) => {
                    setConsumo(e.target.value);
                    setConsumoEstimado(false);
                    // Sincroniza o etanol se ainda não foi editado
                    const n = Number(e.target.value.replace(',', '.'));
                    if (n > 0 && !consumoEtanol) {
                      setConsumoEtanol(
                        String((n * FATOR_ETANOL).toFixed(1)).replace(
                          '.',
                          ',',
                        ),
                      );
                    }
                  }}
                  placeholder="12,5"
                />
              </div>

              {/* Campo de etanol: só aparece para Flex/Etanol */}
              {aceitaEtanol && (
                <div>
                  <Label className="text-xs">
                    Consumo com etanol (km/l)
                  </Label>
                  <Input
                    inputMode="decimal"
                    value={consumoEtanol}
                    onChange={(e) => setConsumoEtanol(e.target.value)}
                    placeholder="8,8"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs">Revenda esperada (R$)</Label>
                <Input
                  inputMode="numeric"
                  value={valorRevenda}
                  onChange={(e) => setValorRevenda(e.target.value)}
                  placeholder="88000"
                />
              </div>
              <div>
                <Label className="text-xs">Km por mês</Label>
                <Input
                  inputMode="numeric"
                  value={kmPorMes}
                  onChange={(e) => setKmPorMes(e.target.value)}
                  placeholder="3000"
                />
              </div>
            </div>

            {consumoEstimado && consumo && (
              <p className="rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground">
                Consumo estimado por modelo/categoria. Se você mediu o consumo
                real do seu carro, digite acima — o valor deixa de ser estimado.
              </p>
            )}

            {aceitaEtanol && consumoEtanol && (
              <p className="rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground">
                O consumo com etanol define o custo real do etanol no cálculo.
                Se deixar em branco, o app usa 70% do consumo da gasolina
                (regra de mercado).
              </p>
            )}

            <div className="flex gap-2">
              <Button onClick={salvar} disabled={!pronto} className="flex-1">
                <Car className="mr-2 h-4 w-4" />
                {editandoId ? 'Salvar alterações' : 'Adicionar veículo'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAbrindo(false);
                  limparForm();
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}