import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, ExternalLink, Download } from 'lucide-react';

const MTGGauntletApp = () => {
  const [gauntlets, setGauntlets] = useState([]);
  const [currentGauntlet, setCurrentGauntlet] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [gauntletName, setGauntletName] = useState('');
  const [editingDeck, setEditingDeck] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGauntlets();
  }, []);

  const loadGauntlets = async () => {
    try {
      const result = await window.storage.list('gauntlet:');
      if (result && result.keys) {
        const gauntletData = await Promise.all(
          result.keys.map(async (key) => {
            const data = await window.storage.get(key);
            return data ? JSON.parse(data.value) : null;
          })
        );
        setGauntlets(gauntletData.filter(Boolean));
      }
    } catch (error) {
      console.log('No gauntlets found yet');
    }
    setLoading(false);
  };

  const saveGauntlet = async (gauntlet) => {
    try {
      await window.storage.set(`gauntlet:${gauntlet.id}`, JSON.stringify(gauntlet), true);
      await loadGauntlets();
    } catch (error) {
      console.error('Failed to save gauntlet:', error);
    }
  };

  const createGauntlet = () => {
    if (!gauntletName.trim()) return;

    const newGauntlet = {
      id: Date.now().toString(),
      name: gauntletName,
      createdAt: new Date().toISOString(),
      decks: {
        tier1: [],
        tier15: [],
        tier2: []
      }
    };

    saveGauntlet(newGauntlet);
    setCurrentGauntlet(newGauntlet);
    setGauntletName('');
    setIsCreating(false);
  };

  const addDeck = (tier) => {
    setEditingDeck({
      tier,
      name: '',
      archetype: '',
      colors: '',
      decklist: '',
      isNew: true
    });
  };

  const parseDecklist = (decklistText) => {
    const lines = decklistText.split('\n');
    const maindeck = [];
    const sideboard = [];
    let inSideboard = false;
    let consecutiveBlankLines = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        consecutiveBlankLines++;
        continue;
      }

      if (line.toLowerCase() === 'sideboard' || line.toLowerCase() === 'sb') {
        inSideboard = true;
        consecutiveBlankLines = 0;
        continue;
      }

      if (consecutiveBlankLines >= 1 && maindeck.length > 0 && !inSideboard) {
        inSideboard = true;
      }

      consecutiveBlankLines = 0;

      if (inSideboard) {
        sideboard.push(line);
      } else {
        maindeck.push(line);
      }
    }

    return { maindeck, sideboard };
  };

  const countCards = (cardList) => {
    return cardList.reduce((total, card) => {
      const match = card.match(/^(\d+)/);
      const quantity = match ? parseInt(match[1]) : 1;
      return total + quantity;
    }, 0);
  };

  const saveDeck = async () => {
    if (!editingDeck.name.trim()) return;

    const { maindeck, sideboard } = parseDecklist(editingDeck.decklist);

    const deck = {
      id: editingDeck.id || Date.now().toString(),
      name: editingDeck.name,
      archetype: editingDeck.archetype,
      colors: editingDeck.colors,
      maindeck: maindeck,
      sideboard: sideboard,
      lastUpdated: new Date().toISOString()
    };

    const updatedGauntlet = { ...currentGauntlet };

    if (editingDeck.isNew) {
      updatedGauntlet.decks[editingDeck.tier].push(deck);
    } else {
      const deckIndex = updatedGauntlet.decks[editingDeck.tier].findIndex(d => d.id === deck.id);
      updatedGauntlet.decks[editingDeck.tier][deckIndex] = deck;
    }

    await saveGauntlet(updatedGauntlet);
    setCurrentGauntlet(updatedGauntlet);
    setEditingDeck(null);
  };

  const deleteDeck = async (tier, deckId) => {
    const updatedGauntlet = { ...currentGauntlet };
    updatedGauntlet.decks[tier] = updatedGauntlet.decks[tier].filter(d => d.id !== deckId);
    await saveGauntlet(updatedGauntlet);
    setCurrentGauntlet(updatedGauntlet);
  };

  const getCardImageUrl = (cardName) => {
    const cleanName = cardName.replace(/^\d+\s+/, '').trim();
    return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cleanName)}&format=image&version=normal`;
  };

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const deleteGauntlet = async (gauntletId) => {
    try {
      await window.storage.delete(`gauntlet:${gauntletId}`, true);
      await loadGauntlets();
      if (currentGauntlet?.id === gauntletId) {
        setCurrentGauntlet(null);
      }
    } catch (error) {
      console.error('Failed to delete gauntlet:', error);
    }
  };

  const getTierLabel = (tier) => {
    switch(tier) {
      case 'tier1': return 'Tier 1';
      case 'tier15': return 'Tier 1.5';
      case 'tier2': return 'Tier 2';
      default: return tier;
    }
  };

  const getTierColor = (tier) => {
    switch(tier) {
      case 'tier1': return 'border-amber-500 bg-amber-50';
      case 'tier15': return 'border-gray-400 bg-gray-50';
      case 'tier2': return 'border-orange-600 bg-orange-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const exportDeck = (deck, format) => {
    let deckText = '';

    if (format === 'mtgo') {
      deckText = deck.maindeck.join('\n');
      if (deck.sideboard && deck.sideboard.length > 0) {
        deckText += '\n\n' + deck.sideboard.join('\n');
      }
    } else if (format === 'mtga') {
      deckText = 'Deck\n' + deck.maindeck.join('\n');
      if (deck.sideboard && deck.sideboard.length > 0) {
        deckText += '\n\nSideboard\n' + deck.sideboard.join('\n');
      }
    }

    const blob = new Blob([deckText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name}_${format}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-xl">Loading gauntlets...</div>
    </div>;
  }

  if (!currentGauntlet) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">MTG Gauntlet Manager</h1>

          {isCreating ? (
            <div className="bg-gray-800 p-6 rounded-lg mb-6">
              <h2 className="text-2xl mb-4">Create New Gauntlet</h2>
              <input
                type="text"
                value={gauntletName}
                onChange={(e) => setGauntletName(e.target.value)}
                placeholder="Gauntlet name"
                className="w-full p-3 bg-gray-700 rounded mb-4 text-white"
                onKeyPress={(e) => e.key === 'Enter' && createGauntlet()}
              />
              <div className="flex gap-2">
                <button onClick={createGauntlet} className="bg-green-600 px-6 py-2 rounded hover:bg-green-700">
                  Create
                </button>
                <button onClick={() => setIsCreating(false)} className="bg-gray-600 px-6 py-2 rounded hover:bg-gray-700">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full bg-blue-600 p-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 mb-8"
            >
              <Plus size={24} />
              Create New Gauntlet
            </button>
          )}

          <div className="space-y-4">
            <h2 className="text-2xl mb-4">Your Gauntlets</h2>
            {gauntlets.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No gauntlets yet. Create one to get started!</p>
            ) : (
              gauntlets.map((gauntlet) => (
                <div key={gauntlet.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                  <div className="flex-1 cursor-pointer" onClick={() => setCurrentGauntlet(gauntlet)}>
                    <h3 className="text-xl font-bold">{gauntlet.name}</h3>
                    <p className="text-gray-400 text-sm">
                      {Object.values(gauntlet.decks).flat().length} decks • Created {new Date(gauntlet.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentGauntlet(gauntlet)}
                      className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => deleteGauntlet(gauntlet.id)}
                      className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8" onMouseMove={handleMouseMove}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => setCurrentGauntlet(null)}
              className="text-blue-400 hover:text-blue-300 mb-2"
            >
              ← Back to Gauntlets
            </button>
            <h1 className="text-4xl font-bold">{currentGauntlet.name}</h1>
            <p className="text-gray-400">
              {Object.values(currentGauntlet.decks).flat().length} decks total
            </p>
          </div>
        </div>

        {editingDeck && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {editingDeck.isNew ? 'Add New Deck' : 'Edit Deck'}
                </h2>
                <button onClick={() => setEditingDeck(null)}>
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  value={editingDeck.name}
                  onChange={(e) => setEditingDeck({...editingDeck, name: e.target.value})}
                  placeholder="Deck name"
                  className="w-full p-3 bg-gray-700 rounded text-white"
                />

                <input
                  type="text"
                  value={editingDeck.archetype}
                  onChange={(e) => setEditingDeck({...editingDeck, archetype: e.target.value})}
                  placeholder="Archetype (e.g., Aggro, Control, Combo)"
                  className="w-full p-3 bg-gray-700 rounded text-white"
                />

                <input
                  type="text"
                  value={editingDeck.colors}
                  onChange={(e) => setEditingDeck({...editingDeck, colors: e.target.value})}
                  placeholder="Colors (e.g., WU, Grixis, 5C)"
                  className="w-full p-3 bg-gray-700 rounded text-white"
                />

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-300">
                    Decklist
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Format: One card per line (e.g., "4 Lightning Bolt"). Separate sideboard with a blank line or "Sideboard" keyword.
                  </p>
                  <textarea
                    value={editingDeck.decklist}
                    onChange={(e) => setEditingDeck({...editingDeck, decklist: e.target.value})}
                    placeholder={'4 Lightning Bolt\n4 Counterspell\n20 Island\n\nSideboard\n3 Surgical Extraction\n2 Blood Moon'}
                    className="w-full p-3 bg-gray-700 rounded text-white h-96 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={saveDeck}
                  className="bg-green-600 px-6 py-2 rounded hover:bg-green-700 flex items-center gap-2"
                >
                  <Save size={16} />
                  Save Deck
                </button>
                <button
                  onClick={() => setEditingDeck(null)}
                  className="bg-gray-600 px-6 py-2 rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {['tier1', 'tier15', 'tier2'].map((tier) => (
            <div key={tier} className={`border-4 ${getTierColor(tier)} rounded-lg p-6`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-gray-900">{getTierLabel(tier)}</h2>
                <button
                  onClick={() => addDeck(tier)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Deck
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentGauntlet.decks[tier].map((deck) => (
                  <div key={deck.id} className="bg-white rounded-lg p-4 shadow-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">{deck.name}</h3>
                        {deck.archetype && (
                          <p className="text-sm text-gray-600">{deck.archetype}</p>
                        )}
                        {deck.colors && (
                          <p className="text-sm text-gray-500 font-semibold">{deck.colors}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            const decklist = deck.maindeck.join('\n') +
                              (deck.sideboard.length > 0 ? '\n\nSideboard\n' + deck.sideboard.join('\n') : '');
                            setEditingDeck({
                              ...deck,
                              tier,
                              decklist: decklist
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Edit deck"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteDeck(tier, deck.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete deck"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => exportDeck(deck, 'mtgo')}
                        className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 flex items-center justify-center gap-1"
                      >
                        <Download size={12} />
                        MTGO
                      </button>
                      <button
                        onClick={() => exportDeck(deck, 'mtga')}
                        className="flex-1 bg-orange-600 text-white px-3 py-1 rounded text-xs hover:bg-orange-700 flex items-center justify-center gap-1"
                      >
                        <Download size={12} />
                        MTGA
                      </button>
                    </div>

                    <div className="mt-3 max-h-80 overflow-y-auto">
                      <p className="text-xs text-gray-500 mb-2">
                        {countCards(deck.maindeck)} maindeck • {countCards(deck.sideboard)} sideboard • Updated {new Date(deck.lastUpdated).toLocaleDateString()}
                      </p>

                      <div className="mb-3">
                        <h4 className="text-xs font-bold text-gray-700 mb-1 uppercase">Maindeck</h4>
                        <ul className="text-sm text-gray-800 font-mono space-y-1">
                          {deck.maindeck.map((card, idx) => (
                            <li
                              key={idx}
                              className="hover:bg-blue-50 p-1 rounded cursor-pointer transition-colors"
                              onMouseEnter={() => setHoveredCard(card)}
                              onMouseLeave={() => setHoveredCard(null)}
                            >
                              {card}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {deck.sideboard && deck.sideboard.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-700 mb-1 uppercase border-t pt-2">Sideboard</h4>
                          <ul className="text-sm text-gray-800 font-mono space-y-1">
                            {deck.sideboard.map((card, idx) => (
                              <li
                                key={idx}
                                className="hover:bg-blue-50 p-1 rounded cursor-pointer transition-colors"
                                onMouseEnter={() => setHoveredCard(card)}
                                onMouseLeave={() => setHoveredCard(null)}
                              >
                                {card}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {currentGauntlet.decks[tier].length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No decks in this tier yet
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {hoveredCard && (
          <div
            className="fixed pointer-events-none z-50"
            style={{
              left: `${Math.min(mousePos.x + 20, window.innerWidth - 280)}px`,
              top: `${Math.min(mousePos.y - 180, window.innerHeight - 380)}px`,
            }}
          >
            <div className="relative animate-fadeIn">
              <img
                src={getCardImageUrl(hoveredCard)}
                alt={hoveredCard}
                className="w-64 rounded-lg shadow-2xl border-4 border-yellow-400"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg">
                {hoveredCard.replace(/^\d+\s+/, '')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MTGGauntletApp;
