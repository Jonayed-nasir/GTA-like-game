import { Hand, Navigation, RotateCcw, Shield, Swords, Target, Users } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { Language, SquadCommand, SquadMemberSnapshot } from '../types/game';

interface SquadCommandBarProps {
  language: Language;
  squadActive: boolean;
  command: SquadCommand;
  members: SquadMemberSnapshot[];
  canSubdueHostile: boolean;
  inVehicle: boolean;
  onSetCommand: (cmd: SquadCommand) => void;
  onSubdueHostile: () => void;
}

export function SquadCommandBar({
  language,
  squadActive,
  command,
  members,
  canSubdueHostile,
  inVehicle,
  onSetCommand,
  onSubdueHostile,
}: SquadCommandBarProps) {
  if (!squadActive && !canSubdueHostile) return null;
  const t = TRANSLATIONS[language];

  const commands: Array<{
    id: SquadCommand;
    keyNum: string;
    label: string;
    icon: typeof Users;
  }> = [
    { id: 'follow', keyNum: '1', label: t.squadFollow, icon: Users },
    { id: 'hold', keyNum: '2', label: t.squadHold, icon: Hand },
    { id: 'objective', keyNum: '3', label: t.squadObjective, icon: Target },
    { id: 'regroup', keyNum: '4', label: t.squadRegroup, icon: RotateCcw },
    { id: 'protect', keyNum: '5', label: t.squadProtect, icon: Shield },
  ];

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none max-w-[90vw]">
      {/* Compact Icon-First Subdue Action Button */}
      {canSubdueHostile && !inVehicle && (
        <button
          type="button"
          onClick={onSubdueHostile}
          aria-label={t.subdueHostile}
          title={`${t.subdueHostile} [R]`}
          className="pointer-events-auto w-11 h-11 sm:w-auto sm:h-auto sm:px-3.5 sm:py-2 rounded-full sm:rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-400 border border-rose-200/75 text-white font-display font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-xl cursor-pointer"
        >
          <Swords className="w-5 h-5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">[R]</span>
        </button>
      )}

      {/* Icon-First Compact Crew Health & 5 Tactical Order Buttons */}
      {squadActive && (
        <div className="pointer-events-auto rounded-xl bg-[#0a111f]/92 border border-sky-400/35 px-2 py-1.5 shadow-xl flex flex-col gap-1">
          <div className="flex items-center justify-center gap-1.5">
            <Navigation className="w-3 h-3 text-sky-400 shrink-0" />
            {members.map((m) => (
              <div
                key={m.id}
                title={language === 'bn' ? m.callsignBn : m.callsignEn}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#121e33] border border-white/10"
              >
                <div className="w-7 sm:w-9 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${m.health < 45 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${Math.round((m.health / m.maxHealth) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-1">
            {commands.map((c) => {
              const Icon = c.icon;
              const active = command === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSetCommand(c.id)}
                  aria-label={c.label}
                  title={`${c.keyNum}: ${c.label}`}
                  className={`w-8 h-8 sm:w-9 sm:h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                    active
                      ? 'bg-sky-400 text-slate-950'
                      : 'bg-white/8 hover:bg-white/16 text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
