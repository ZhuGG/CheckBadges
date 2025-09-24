import { useCallback } from 'react';
import { useAppStore } from '../state/store';
import { t } from '../lib/i18n';

const sliderProps = {
  min: 0.5,
  max: 1,
  step: 0.01
};

export default function SettingsPanel() {
  const { thresholds, toleranceAccents, setThresholds, setToleranceAccents } = useAppStore(
    (state) => ({
      thresholds: state.thresholds,
      toleranceAccents: state.toleranceAccents,
      setThresholds: state.setThresholds,
      setToleranceAccents: state.setToleranceAccents
    })
  );

  const handleSliderChange = useCallback(
    (key: 'prenom' | 'nom' | 'passion') =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setThresholds({ [key]: Number(event.target.value) });
      },
    [setThresholds]
  );

  const handleToleranceToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setToleranceAccents(event.target.checked);
    },
    [setToleranceAccents]
  );

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-sm">
      <header>
        <h2 className="text-lg font-semibold text-slate-800">{t('settings.title', 'Paramètres de correspondance')}</h2>
        <p className="text-xs text-slate-500">{t('settings.subtitle', '')}</p>
      </header>

      <div className="space-y-4">
        <Slider
          label={t('settings.prenom', 'Seuil prénom')}
          value={thresholds.prenom}
          onChange={handleSliderChange('prenom')}
        />
        <Slider
          label={t('settings.nom', 'Seuil nom')}
          value={thresholds.nom}
          onChange={handleSliderChange('nom')}
        />
        <Slider
          label={t('settings.passion', 'Seuil passion')}
          value={thresholds.passion}
          onChange={handleSliderChange('passion')}
        />
      </div>

      <label className="flex items-center gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={toleranceAccents}
          onChange={handleToleranceToggle}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        {t('settings.tolerance', 'Tolérer les accents et diacritiques')}
      </label>
    </section>
  );
}

interface SliderProps {
  label: string;
  value: number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function Slider({ label, value, onChange }: SliderProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{label}</span>
        <span className="font-mono text-slate-700">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={sliderProps.min}
        max={sliderProps.max}
        step={sliderProps.step}
        value={value}
        onChange={onChange}
        className="accent-blue-600"
      />
    </div>
  );
}
