import React, { useState } from 'react';
import { MapPin, Search, Navigation, Check, X, Sparkles, Globe, Compass, Loader2 } from 'lucide-react';
import { REFERENCE_LOCATIONS, GeoLocationItem, detectPreciseGPS, PreciseLocationResult } from '../utils/geoService';

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocationName: string;
  currentLatitude?: number;
  currentLongitude?: number;
  onSelectLocation: (loc: PreciseLocationResult) => void;
}

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  isOpen,
  onClose,
  currentLocationName,
  onSelectLocation
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'ABIDJAN' | 'INTERIEUR_CI' | 'DIASPORA'>('ABIDJAN');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTriggerGps = async () => {
    setIsDetectingGps(true);
    setGpsError(null);
    try {
      const result = await detectPreciseGPS();
      onSelectLocation(result);
      onClose();
    } catch (err: any) {
      console.warn("Erreur détection GPS :", err);
      setGpsError(
        err?.code === 1
          ? "Permission refusée. Vous pouvez sélectionner votre commune manuellement ci-dessous."
          : "Position GPS non accessible. Choisissez votre commune dans la liste ci-dessous."
      );
    } finally {
      setIsDetectingGps(false);
    }
  };

  const handleSelectItem = (item: GeoLocationItem) => {
    onSelectLocation({
      latitude: item.latitude,
      longitude: item.longitude,
      city: item.name,
      isGps: false
    });
    onClose();
  };

  const filteredLocations = REFERENCE_LOCATIONS.filter(item => {
    const matchesTab = activeTab === 'ALL' || item.category === activeTab;
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.region.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const popularLocations = REFERENCE_LOCATIONS.filter(item => item.popular);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Arrière-plan flouté */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Carte du Modal */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-200 text-left flex flex-col max-h-[90vh]">
        {/* En-tête */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
              <MapPin size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Votre Localisation & Commune</h3>
              <p className="text-xs text-slate-500">Pour calculer la distance avec vos futurs matchs chrétiens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corps avec scroll */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* BOUTON DÉTECTION GPS EXACT */}
          <div>
            <button
              type="button"
              onClick={handleTriggerGps}
              disabled={isDetectingGps}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-2xl font-extrabold text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center space-x-2.5 active:scale-98 cursor-pointer"
            >
              {isDetectingGps ? (
                <>
                  <Loader2 size={18} className="animate-spin text-white" />
                  <span>Localisation satellite en cours...</span>
                </>
              ) : (
                <>
                  <Navigation size={18} className="text-amber-300 fill-amber-300" />
                  <span>📡 Détecter ma position GPS exacte</span>
                </>
              )}
            </button>

            {gpsError && (
              <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
                <Compass size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p>{gpsError}</p>
              </div>
            )}
          </div>

          {/* CHIPS POPULAIRES RAPIDES */}
          <div>
            <div className="flex items-center space-x-1 mb-2">
              <Sparkles size={14} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Accès Rapide :</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {popularLocations.slice(0, 8).map((pop) => (
                <button
                  key={pop.id}
                  type="button"
                  onClick={() => handleSelectItem(pop)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition cursor-pointer active:scale-95 ${
                    currentLocationName.includes(pop.name) || pop.name.includes(currentLocationName)
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200 border-slate-200'
                  }`}
                >
                  {pop.name.replace('Abidjan, ', '')}
                </button>
              ))}
            </div>
          </div>

          {/* BARRE DE RECHERCHE */}
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher une commune, ville ou quartier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
            />
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          </div>

          {/* ONGLETS DES RÉGIONS */}
          <div className="flex items-center space-x-1 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('ABIDJAN')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'ABIDJAN'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              🏙️ Abidjan ({REFERENCE_LOCATIONS.filter(l => l.category === 'ABIDJAN').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('INTERIEUR_CI')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'INTERIEUR_CI'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              🌴 Intérieur CI ({REFERENCE_LOCATIONS.filter(l => l.category === 'INTERIEUR_CI').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DIASPORA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'DIASPORA'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ✈️ Diaspora ({REFERENCE_LOCATIONS.filter(l => l.category === 'DIASPORA').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Toutes ({REFERENCE_LOCATIONS.length})
            </button>
          </div>

          {/* LISTE DES EMPLACEMENTS */}
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {filteredLocations.map((loc) => {
              const isSelected =
                currentLocationName.toLowerCase() === loc.name.toLowerCase() ||
                currentLocationName.toLowerCase().includes(loc.name.toLowerCase());

              return (
                <div
                  key={loc.id}
                  onClick={() => handleSelectItem(loc)}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer active:scale-99 ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                        loc.category === 'ABIDJAN'
                          ? 'bg-teal-50 text-teal-700'
                          : loc.category === 'INTERIEUR_CI'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {loc.category === 'ABIDJAN' ? <MapPin size={16} /> : loc.category === 'INTERIEUR_CI' ? <Compass size={16} /> : <Globe size={16} />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{loc.name}</div>
                      <div className="text-[11px] text-slate-400">{loc.region}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check size={14} />
                    </div>
                  )}
                </div>
              );
            })}

            {filteredLocations.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <Search size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Aucun lieu correspondant à votre recherche.</p>
              </div>
            )}
          </div>
        </div>

        {/* Pied de page */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
