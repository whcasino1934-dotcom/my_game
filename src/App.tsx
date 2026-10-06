import {
  Coins,
  Crosshair,
  Flag,
  Fuel,
  Hammer,
  Radar,
  SkipForward,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ResourceType = 'gold' | 'oil' | 'steel' | 'tech'
export type RegionId = 'america' | 'eurasia' | 'europe' | 'mea'
export type BiomeId = 'plains' | 'snow' | 'desert'
export type FactionId = 'player' | 'bot1' | 'bot2'

export interface Country {
  id: string
  name: string
  region: RegionId
  biome: BiomeId
  resource: ResourceType
}

export interface MapCell {
  q: number
  r: number
  kind: 'ocean' | 'land'
  countryId?: string
}

export interface Faction {
  id: FactionId
  name: string
  isHuman: boolean
  homeCountryId: string
}

export interface Resources {
  gold: number
  oil: number
  steel: number
}

export interface LogEntry {
  id: number
  turn: number
  text: string
}

export interface GameState {
  turn: number
  maxTurns: number
  playerResources: Resources
  factions: Faction[]
  ownership: Record<string, FactionId>
  selectedCountryId: string | null
  log: LogEntry[]
  gameOver: boolean
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const HEX_W = 96
const HEX_H = 111
const GRID_COLS = 9
const GRID_ROWS = 9
const MAX_TURNS = 100
const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'

const RESOURCE_LABEL: Record<ResourceType, string> = {
  gold: 'Золото',
  oil: 'Нефть',
  steel: 'Сталь',
  tech: 'Технологии',
}

const REGION_LABEL: Record<RegionId, string> = {
  america: 'Америка',
  eurasia: 'Евразия',
  europe: 'Европа',
  mea: 'Ближний Восток и Африка',
}

const BIOME_CLASS: Record<BiomeId, string> = {
  plains:
    'bg-gradient-to-b from-lime-900 via-[#3d4a1f] to-[#14210f] text-lime-50',
  snow: 'bg-gradient-to-b from-slate-50 via-sky-100 to-sky-300 text-slate-800',
  desert:
    'bg-gradient-to-b from-amber-200 via-yellow-600 to-amber-900 text-amber-950',
}

export const COUNTRIES: Country[] = [
  // Америка — равнины
  { id: 'usa', name: 'США', region: 'america', biome: 'plains', resource: 'tech' },
  { id: 'canada', name: 'Канада', region: 'america', biome: 'plains', resource: 'steel' },
  { id: 'mexico', name: 'Мексика', region: 'america', biome: 'plains', resource: 'gold' },
  { id: 'brazil', name: 'Бразилия', region: 'america', biome: 'plains', resource: 'steel' },
  { id: 'argentina', name: 'Аргентина', region: 'america', biome: 'plains', resource: 'gold' },
  { id: 'colombia', name: 'Колумбия', region: 'america', biome: 'plains', resource: 'gold' },
  { id: 'peru', name: 'Перу', region: 'america', biome: 'plains', resource: 'steel' },
  { id: 'chile', name: 'Чили', region: 'america', biome: 'plains', resource: 'steel' },
  // Евразия — снег
  { id: 'russia', name: 'Россия', region: 'eurasia', biome: 'snow', resource: 'oil' },
  { id: 'china', name: 'Китай', region: 'eurasia', biome: 'snow', resource: 'tech' },
  { id: 'india', name: 'Индия', region: 'eurasia', biome: 'snow', resource: 'steel' },
  { id: 'japan', name: 'Япония', region: 'eurasia', biome: 'snow', resource: 'tech' },
  { id: 'skorea', name: 'Южная Корея', region: 'eurasia', biome: 'snow', resource: 'tech' },
  { id: 'kazakhstan', name: 'Казахстан', region: 'eurasia', biome: 'snow', resource: 'oil' },
  { id: 'pakistan', name: 'Пакистан', region: 'eurasia', biome: 'snow', resource: 'steel' },
  { id: 'mongolia', name: 'Монголия', region: 'eurasia', biome: 'snow', resource: 'gold' },
  // Европа — равнины
  { id: 'germany', name: 'Германия', region: 'europe', biome: 'plains', resource: 'tech' },
  { id: 'france', name: 'Франция', region: 'europe', biome: 'plains', resource: 'tech' },
  { id: 'spain', name: 'Испания', region: 'europe', biome: 'plains', resource: 'gold' },
  { id: 'italy', name: 'Италия', region: 'europe', biome: 'plains', resource: 'steel' },
  { id: 'uk', name: 'Великобритания', region: 'europe', biome: 'plains', resource: 'tech' },
  { id: 'poland', name: 'Польша', region: 'europe', biome: 'plains', resource: 'steel' },
  { id: 'sweden', name: 'Швеция', region: 'europe', biome: 'plains', resource: 'steel' },
  { id: 'austria', name: 'Австрия', region: 'europe', biome: 'plains', resource: 'gold' },
  // Ближний Восток и Африка — пустыня
  { id: 'saudi', name: 'Саудовская Аравия', region: 'mea', biome: 'desert', resource: 'oil' },
  { id: 'egypt', name: 'Египет', region: 'mea', biome: 'desert', resource: 'gold' },
  { id: 'uae', name: 'ОАЭ', region: 'mea', biome: 'desert', resource: 'oil' },
  { id: 'turkey', name: 'Турция', region: 'mea', biome: 'desert', resource: 'steel' },
  { id: 'southafrica', name: 'ЮАР', region: 'mea', biome: 'desert', resource: 'gold' },
  { id: 'algeria', name: 'Алжир', region: 'mea', biome: 'desert', resource: 'oil' },
  { id: 'nigeria', name: 'Нигерия', region: 'mea', biome: 'desert', resource: 'oil' },
  { id: 'iran', name: 'Иран', region: 'mea', biome: 'desert', resource: 'oil' },
]

const COUNTRY_BY_ID: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((country) => [country.id, country]),
)

/** Компактный остров: запад — Америка, север — Европа, восток — Евразия, юг — МЕА. */
const LAND_AT: Record<string, string> = {
  '1,2': 'canada',
  '1,3': 'uk',
  '1,4': 'sweden',
  '1,5': 'russia',
  '2,1': 'usa',
  '2,2': 'france',
  '2,3': 'germany',
  '2,4': 'poland',
  '2,5': 'kazakhstan',
  '3,1': 'mexico',
  '3,2': 'spain',
  '3,3': 'italy',
  '3,4': 'austria',
  '3,5': 'mongolia',
  '3,6': 'china',
  '4,1': 'colombia',
  '4,2': 'turkey',
  '4,3': 'egypt',
  '4,4': 'iran',
  '4,5': 'india',
  '4,6': 'skorea',
  '5,2': 'peru',
  '5,3': 'algeria',
  '5,4': 'saudi',
  '5,5': 'pakistan',
  '5,6': 'japan',
  '6,2': 'brazil',
  '6,3': 'chile',
  '6,4': 'nigeria',
  '6,5': 'uae',
  '7,3': 'argentina',
  '7,4': 'southafrica',
}

export const MAP_CELLS: MapCell[] = Array.from({ length: GRID_ROWS }, (_, r) =>
  Array.from({ length: GRID_COLS }, (_, q) => {
    const countryId = LAND_AT[`${r},${q}`]
    if (countryId) {
      return { q, r, kind: 'land' as const, countryId }
    }
    return { q, r, kind: 'ocean' as const }
  }),
).flat()

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function shuffle<T>(items: T[]): T[] {
  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

function createInitialState(): GameState {
  const [playerHome, bot1Home, bot2Home] = shuffle(COUNTRIES.map((c) => c.id))

  const playerCountry = COUNTRY_BY_ID[playerHome]

  return {
    turn: 1,
    maxTurns: MAX_TURNS,
    playerResources: { gold: 5, oil: 5, steel: 5 },
    factions: [
      {
        id: 'player',
        name: 'Командование',
        isHuman: true,
        homeCountryId: playerHome,
      },
      {
        id: 'bot1',
        name: 'Призрак-Альфа',
        isHuman: false,
        homeCountryId: bot1Home,
      },
      {
        id: 'bot2',
        name: 'Призрак-Бета',
        isHuman: false,
        homeCountryId: bot2Home,
      },
    ],
    ownership: {
      [playerHome]: 'player',
      [bot1Home]: 'bot1',
      [bot2Home]: 'bot2',
    },
    selectedCountryId: playerHome,
    log: [
      {
        id: 1,
        turn: 1,
        text: 'Система планшета онлайн. Карта острова синхронизирована.',
      },
      {
        id: 2,
        turn: 1,
        text: `Скрытый ГСЧ-респаун выполнен. Стартовый сектор: ${playerCountry.name}. Позиции ботов скрыты туманом войны.`,
      },
    ],
    gameOver: false,
  }
}

function isRevealed(state: GameState, countryId: string): boolean {
  return state.ownership[countryId] === 'player'
}

/* -------------------------------------------------------------------------- */
/* Hex cell                                                                   */
/* -------------------------------------------------------------------------- */

function HexCell({
  cell,
  country,
  revealed,
  selected,
  isPlayerHome,
  onSelect,
}: {
  cell: MapCell
  country?: Country
  revealed: boolean
  selected: boolean
  isPlayerHome: boolean
  onSelect: (countryId: string) => void
}) {
  const sizeStyle = {
    width: HEX_W,
    height: HEX_H,
    clipPath: HEX_CLIP,
  }

  if (cell.kind === 'ocean' || !country) {
    return (
      <div
        aria-hidden
        className="shrink-0 bg-blue-950/40"
        style={sizeStyle}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(country.id)}
      className={[
        'relative shrink-0 overflow-hidden px-1 text-center leading-tight transition',
        BIOME_CLASS[country.biome],
        selected ? 'brightness-125' : 'hover:brightness-110',
        isPlayerHome ? 'ring-0' : '',
      ].join(' ')}
      style={{
        ...sizeStyle,
        filter: isPlayerHome
          ? 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.85))'
          : selected
            ? 'drop-shadow(0 0 6px rgba(250, 204, 21, 0.55))'
            : 'drop-shadow(0 0 1px rgba(8, 47, 73, 0.9))',
      }}
    >
      {!revealed && (
        <span className="pointer-events-none absolute inset-0 z-0 bg-slate-950/65" />
      )}
      <span className="relative z-10 flex h-full flex-col items-center justify-center gap-0.5">
        {revealed ? (
          <>
            {isPlayerHome && (
              <Flag className="h-3.5 w-3.5 text-cyan-300 drop-shadow" />
            )}
            <span className="line-clamp-2 text-[10px] font-bold tracking-wide uppercase">
              {country.name}
            </span>
            <span className="text-[9px] opacity-80">
              {RESOURCE_LABEL[country.resource]}
            </span>
          </>
        ) : (
          <span className="text-xs font-black tracking-[0.3em] text-slate-300">
            ???
          </span>
        )}
      </span>
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/* App                                                                        */
/* -------------------------------------------------------------------------- */

export default function App() {
  const [state, setState] = useState<GameState>(() => createInitialState())
  const logRef = useRef<HTMLDivElement>(null)

  const player = state.factions.find((faction) => faction.id === 'player')!
  const playerCountry = COUNTRY_BY_ID[player.homeCountryId]
  const selected = state.selectedCountryId
    ? COUNTRY_BY_ID[state.selectedCountryId]
    : undefined
  const selectedRevealed = selected
    ? isRevealed(state, selected.id)
    : false

  const rows = useMemo(
    () =>
      Array.from({ length: GRID_ROWS }, (_, r) =>
        MAP_CELLS.filter((cell) => cell.r === r),
      ),
    [],
  )

  useEffect(() => {
    const node = logRef.current
    if (node) {
      node.scrollTop = node.scrollHeight
    }
  }, [state.log])

  const pushLog = (text: string, next: GameState): GameState => ({
    ...next,
    log: [
      ...next.log,
      { id: next.log.length + 1, turn: next.turn, text },
    ].slice(-80),
  })

  const handleSelect = (countryId: string) => {
    setState((current) => {
      const country = COUNTRY_BY_ID[countryId]
      const revealed = isRevealed(current, countryId)
      const text = revealed
        ? `Сектор подтверждён: ${country.name}. Ресурс — ${RESOURCE_LABEL[country.resource]}.`
        : 'Туман войны: сектор не разведан. Сигнатура противника неизвестна.'
      return pushLog(text, { ...current, selectedCountryId: countryId })
    })
  }

  const handleEndTurn = () => {
    setState((current) => {
      if (current.gameOver) {
        return current
      }
      if (current.turn >= current.maxTurns) {
        return pushLog('Лимит операций исчерпан. Кампания завершена.', {
          ...current,
          gameOver: true,
        })
      }
      const turn = current.turn + 1
      const gameOver = turn >= current.maxTurns
      let next: GameState = { ...current, turn, gameOver }
      next = pushLog(
        `Ход ${current.turn} закрыт. Боты выполнили скрытые манёвры.`,
        next,
      )
      if (gameOver) {
        next = pushLog('Достигнут ход 100 / 100. Кампания завершена.', next)
      }
      return next
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-3 p-4">
        <header className="flex flex-wrap items-center justify-between gap-3 border border-cyan-900/60 bg-slate-900/80 px-4 py-3 shadow-[inset_0_0_40px_rgba(8,47,73,0.35)]">
          <div className="flex items-center gap-3">
            <Crosshair className="h-6 w-6 text-cyan-400" />
            <div>
              <p className="text-[10px] tracking-[0.35em] text-cyan-500 uppercase">
                Sci-Fi Tactical Tablet
              </p>
              <h1 className="text-lg font-semibold tracking-widest text-cyan-100 uppercase">
                Nexus Command
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ResourceChip icon={<Coins className="h-4 w-4" />} label="Золото" value={state.playerResources.gold} />
            <ResourceChip icon={<Fuel className="h-4 w-4" />} label="Нефть" value={state.playerResources.oil} />
            <ResourceChip icon={<Hammer className="h-4 w-4" />} label="Сталь" value={state.playerResources.steel} />
          </div>

          <div className="flex items-center gap-3">
            <div className="border border-cyan-800/70 px-3 py-1 text-sm tracking-widest text-cyan-200">
              ХОД {state.turn} / {state.maxTurns}
            </div>
            <button
              type="button"
              onClick={handleEndTurn}
              disabled={state.gameOver}
              className="flex items-center gap-2 border border-cyan-400/40 bg-cyan-950 px-4 py-2 text-xs font-bold tracking-[0.2em] text-cyan-100 uppercase hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SkipForward className="h-4 w-4" />
              Конец хода
            </button>
          </div>
        </header>

        <section className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <div className="overflow-hidden border border-cyan-900/50 bg-[#020617] p-4">
            <div className="mb-3 flex items-center justify-between text-[10px] tracking-[0.25em] text-cyan-600 uppercase">
              <span>Гексагональная сетка // остров 32</span>
              <span className="flex items-center gap-1">
                <Radar className="h-3 w-3" />
                Туман войны активен
              </span>
            </div>
            <div className="flex justify-center">
              <div>
                {rows.map((row, r) => (
                  <div
                    key={r}
                    className="flex"
                    style={{
                      marginLeft: r % 2 === 1 ? HEX_W / 2 : 0,
                      marginTop: r === 0 ? 0 : -HEX_H * 0.25,
                    }}
                  >
                    {row.map((cell) => {
                      const country = cell.countryId
                        ? COUNTRY_BY_ID[cell.countryId]
                        : undefined
                      const revealed = country
                        ? isRevealed(state, country.id)
                        : false
                      return (
                        <HexCell
                          key={`${cell.q},${cell.r}`}
                          cell={cell}
                          country={country}
                          revealed={revealed}
                          selected={state.selectedCountryId === country?.id}
                          isPlayerHome={country?.id === player.homeCountryId}
                          onSelect={handleSelect}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-[10px] tracking-widest text-slate-400 uppercase">
              <LegendSwatch className="bg-gradient-to-b from-lime-900 to-[#14210f]" label="Равнины" />
              <LegendSwatch className="bg-gradient-to-b from-slate-50 to-sky-300" label="Скандинавия / снег" />
              <LegendSwatch className="bg-gradient-to-b from-amber-200 to-amber-900" label="Пустыня" />
              <LegendSwatch className="bg-blue-950/40" label="Океан" />
            </div>
          </div>

          <aside className="border border-cyan-900/50 bg-slate-900/70 p-4">
            <p className="text-[10px] tracking-[0.3em] text-cyan-600 uppercase">
              Разведданные
            </p>
            {selected ? (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-lg font-semibold text-cyan-100">
                  {selectedRevealed ? selected.name : 'Неизвестный сектор'}
                </p>
                {selectedRevealed ? (
                  <>
                    <p>Регион: {REGION_LABEL[selected.region]}</p>
                    <p>Биом: {selected.biome === 'plains' ? 'Равнины' : selected.biome === 'snow' ? 'Скандинавия / снег' : 'Пустыня'}</p>
                    <p>Ресурс: {RESOURCE_LABEL[selected.resource]}</p>
                    <p>
                      Контроль:{' '}
                      {state.ownership[selected.id] === 'player'
                        ? 'Командование (вы)'
                        : '—'}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400">
                    Координаты зафиксированы, но оптика закрыта туманом войны.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Сектор не выбран.</p>
            )}
            <div className="mt-6 border-t border-cyan-900/40 pt-3 text-xs text-slate-400">
              <p>Столица: {playerCountry.name}</p>
              <p>Фракция: {player.name}</p>
              <p>Противники: 2 ИИ (скрыты)</p>
            </div>
          </aside>
        </section>

        <section className="border border-cyan-900/40 bg-black p-3">
          <p className="mb-1 text-[10px] tracking-[0.3em] text-green-700 uppercase">
            Лог событий
          </p>
          <div
            ref={logRef}
            className="h-28 overflow-y-auto font-mono text-sm leading-relaxed text-green-400"
          >
            {state.log.map((entry) => (
              <p key={entry.id}>
                [{String(entry.turn).padStart(3, '0')}] {entry.text}
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function ResourceChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-2 border border-amber-900/50 bg-slate-950 px-3 py-1.5">
      <span className="text-amber-400">{icon}</span>
      <span className="text-[10px] tracking-widest text-amber-200/80 uppercase">
        {label}
      </span>
      <span className="font-bold text-amber-100">{value}</span>
    </div>
  )
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-3 w-3 border border-slate-700 ${className}`} />
      {label}
    </span>
  )
}
