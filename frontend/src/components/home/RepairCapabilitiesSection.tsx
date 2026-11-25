'use client';

import Link from 'next/link';
import {
  BoltIcon,
  CircleStackIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  PowerIcon,
  RectangleGroupIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import type { HomepageContent } from '@/types';
import { usePublicI18n } from '@/lib/i18n/PublicI18nProvider';

const ICONS = [ComputerDesktopIcon, BoltIcon, CpuChipIcon, PowerIcon, CircleStackIcon, RectangleGroupIcon, WrenchScrewdriverIcon, CpuChipIcon];

const DEFAULT_CAPABILITIES = [
  { title: 'V8 & V12 Engine Parts', description: 'Clutches, exhaust silencers, Bluetooth controllers and mechanical accessories for CISON LS-52 and other V-configuration engine models.', faults: ['Clutch wear', 'Exhaust fitment', 'MCU tuning'], brands: 'CISON and compatible accessories' },
  { title: 'Stirling Engine Components', description: 'Replacement parts and upgrade accessories for single-cylinder, multi-cylinder and low-temperature Stirling engine models.', faults: ['Displacer seals', 'Heat transfer parts', 'Assembly components'], brands: 'ENJOMOR, RETROL and compatible brands' },
  { title: 'Nitro RC Engine Parts', description: 'Fuel system parts, glow plugs, air filters, cooling components and powertrain accessories for nitro RC cars and crawlers.', faults: ['Fuel system', 'Cooling circuit', 'Drivetrain wear'], brands: 'SEMTO, TOYAN and compatible brands' },
  { title: 'RC Car Chassis & Drivetrain', description: '4WD drivetrain components, servo mounts, chassis hardware and suspension parts for nitro-powered RC crawlers and racing vehicles.', faults: ['4WD components', 'Servo linkage', 'Suspension parts'], brands: 'VRX, HSP and compatible brands' },
  { title: 'Electronic Control Modules', description: 'MCU Bluetooth controllers, ESC units, receiver boards and electronic accessories for model engines and RC vehicles.', faults: ['Bluetooth pairing', 'ESC calibration', 'Firmware issues'], brands: 'CISON, ENJOMOR and compatible brands' },
  { title: 'RC Helicopter Parts', description: 'Rotor blades, servos, motor mounts and electronic flight controller parts for RC helicopter models.', faults: ['Blade balance', 'Servo response', 'Motor mount wear'], brands: 'YU XIANG, FLYWING and compatible brands' },
  { title: '3D Metal Assembly Kits', description: 'Replacement and upgrade parts for desktop metal engine assembly kits and display models.', faults: ['Missing components', 'Assembly tolerances', 'Display fixtures'], brands: 'TECHING and compatible brands' },
  { title: 'General Engine Accessories', description: 'Universal accessories including mounting stands, display cases, fuel tanks, water cooling parts and tool kits for model builders.', faults: ['Fitment checks', 'Compatibility', 'Upgrade options'], brands: 'All major model engine brands' },
];

type RepairCapability = (typeof DEFAULT_CAPABILITIES)[number];

function parseCapabilities(content?: HomepageContent | null): RepairCapability[] {
  const raw = content?.data;
  if (!raw) return DEFAULT_CAPABILITIES;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed?.capabilities) && parsed.capabilities.length > 0
      ? parsed.capabilities as RepairCapability[]
      : DEFAULT_CAPABILITIES;
  } catch { return DEFAULT_CAPABILITIES; }
}

export default function RepairCapabilitiesSection({ content }: { content?: HomepageContent | null }) {
  const { href } = usePublicI18n();
  const capabilities = parseCapabilities(content);
  return (
    <section id="repair-capabilities" className="home-deferred-section bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--site-primary)]">Parts & accessories guide</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{content?.title || 'Parts for Every Build'}</h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            {content?.description || 'We carry spare parts and accessories for all major model engine and RC brands — CISON, ENJOMOR, TOYAN, RETROL, SEMTO, TECHING and more. If you need a specific part, contact us with your engine model and we will help you find it.'}
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {capabilities.slice(0, 12).map((item, index) => {
            const Icon = ICONS[index % ICONS.length];
            return (
              <article key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-50 text-[var(--site-primary)]"><Icon className="h-6 w-6" /></div>
                <h3 className="mt-5 text-xl font-bold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                <ul className="mt-5 space-y-2 border-t border-slate-200 pt-4">
                  {(item.faults || []).slice(0, 4).map((fault: string) => <li key={fault} className="flex gap-2 text-sm font-medium text-slate-700"><span className="text-orange-600">•</span>{fault}</li>)}
                </ul>
                <p className="mt-5 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Typical coverage:</strong> {item.brands}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-lg bg-slate-950 p-7 text-white sm:flex-row sm:items-center">
          <div><h3 className="text-xl font-bold">Can&apos;t find the part you need?</h3><p className="mt-2 text-sm leading-6 text-slate-300">Tell us your engine brand and model — we will check stock and find the right part for you.</p></div>
          <Link href={href(content?.button_url || '/contact')} className="shrink-0 rounded-md bg-[var(--site-primary)] px-6 py-3 font-bold text-white hover:bg-[var(--site-primary-strong)]">{content?.button_text || 'Contact Us'}</Link>
        </div>
      </div>
    </section>
  );
}
