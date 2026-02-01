'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hole } from '@/app/api/courses/route';

type TabType = 'holes' | 'menTees' | 'womenTees';

interface TeeFormData {
  name: string;
  cr: string | number;
  slope: string | number;
}

export default function AddCoursePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('holes');

  const emptyHole = (): Hole => ({ number: 1, handicap: 1, par: 4 });
  const emptyTee = (): TeeFormData => ({ name: '', cr: '72.0', slope: '113' });

  const [formData, setFormData] = useState<{
    name: string;
    address: string;
    holes: Hole[];
    menTees: TeeFormData[];
    womenTees: TeeFormData[];
  }>({
    name: '',
    address: '',
    holes: [],
    menTees: [],
    womenTees: []
  });

  const renumberHoles = (holes: Hole[]): Hole[] => {
    return holes.map((hole, index) => ({ ...hole, number: index + 1 }));
  };

  const addHole = () => {
    setFormData(prev => ({
      ...prev,
      holes: [...prev.holes, { ...emptyHole(), number: prev.holes.length + 1 }]
    }));
  };

  const removeHole = (index: number) => {
    setFormData(prev => ({
      ...prev,
      holes: renumberHoles(prev.holes.filter((_, i) => i !== index))
    }));
  };

  const updateHole = (index: number, field: keyof Hole, value: number) => {
    setFormData(prev => ({
      ...prev,
      holes: prev.holes.map((hole, i) => 
        i === index ? { ...hole, [field]: value } : hole
      )
    }));
  };

  const addMenTee = () => {
    // Validate existing tees before adding new one
    const validationError = validateTees(formData.menTees, "Men's");
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setFormData(prev => ({
      ...prev,
      menTees: [...prev.menTees, emptyTee()]
    }));
  };

  const removeMenTee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      menTees: prev.menTees.filter((_, i) => i !== index)
    }));
  };

  const updateMenTee = (index: number, field: keyof TeeFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      menTees: prev.menTees.map((tee, i) => 
        i === index ? { ...tee, [field]: value } : tee
      )
    }));
  };

  const addWomenTee = () => {
    // Validate existing tees before adding new one
    const validationError = validateTees(formData.womenTees, "Women's");
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setFormData(prev => ({
      ...prev,
      womenTees: [...prev.womenTees, emptyTee()]
    }));
  };

  const removeWomenTee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      womenTees: prev.womenTees.filter((_, i) => i !== index)
    }));
  };

  const updateWomenTee = (index: number, field: keyof TeeFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      womenTees: prev.womenTees.map((tee, i) => 
        i === index ? { ...tee, [field]: value } : tee
      )
    }));
  };

  const handleDecimalChange = (value: string): string | null => {
    const normalized = value.replace(',', '.');
    if (normalized === '' || normalized === '.' || /^\d*\.?\d*$/.test(normalized)) {
      return normalized;
    }
    return null; // Invalid input, don't update
  };

  const validateTees = (tees: TeeFormData[], teeName: string): string | null => {
    for (let i = 0; i < tees.length; i++) {
      const tee = tees[i];
      if (!tee.name.trim()) {
        return `${teeName} tee #${i + 1}: Name is required`;
      }
      const crValue = String(tee.cr).replace(',', '.');
      const slopeValue = String(tee.slope).replace(',', '.');
      const crNum = parseFloat(crValue);
      const slopeNum = parseFloat(slopeValue);
      if (isNaN(crNum) || crNum <= 0) {
        return `${teeName} tee "${tee.name || `#${i + 1}`}": CR must be a valid number`;
      }
      if (isNaN(slopeNum) || slopeNum <= 0) {
        return `${teeName} tee "${tee.name || `#${i + 1}`}": Slope must be a valid number`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate all tees before submitting
    const menValidation = validateTees(formData.menTees, "Men's");
    if (menValidation) {
      setError(menValidation);
      return;
    }
    const womenValidation = validateTees(formData.womenTees, "Women's");
    if (womenValidation) {
      setError(womenValidation);
      return;
    }
    
    setSaving(true);
    
    // Convert string values to numbers before submitting
    const submitData = {
      ...formData,
      menTees: formData.menTees.map(tee => ({
        name: tee.name,
        cr: parseFloat(String(tee.cr).replace(',', '.')),
        slope: parseFloat(String(tee.slope).replace(',', '.'))
      })),
      womenTees: formData.womenTees.map(tee => ({
        name: tee.name,
        cr: parseFloat(String(tee.cr).replace(',', '.')),
        slope: parseFloat(String(tee.slope).replace(',', '.'))
      }))
    };

    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to create course');
      }

      router.push('/courses');
    } catch (error) {
      console.error('Error creating course:', error);
      setError(error instanceof Error ? error.message : 'Failed to create course');
      setSaving(false);
    }
  };

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'holes', label: 'Holes', count: formData.holes.length },
    { key: 'menTees', label: "Men's Tees", count: formData.menTees.length },
    { key: 'womenTees', label: "Women's Tees", count: formData.womenTees.length },
  ];

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/courses')}
            className="text-brand hover:text-brand/80 mb-4 inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Courses
          </button>
          <h1 className="text-3xl font-bold text-brand-dark">Add New Course</h1>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-danger-50 text-danger-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-brand-dark mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
                  Course Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-100 rounded-md text-brand-dark focus:ring-brand focus:border-brand"
                  required
                />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-400 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-100 rounded-md text-brand-dark focus:ring-brand focus:border-brand"
                  required
                />
              </div>
            </div>
            
            {/* Course Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div>
                <span className="text-sm font-medium text-gray-400">Holes: </span>
                <span className="text-sm text-brand-dark">{formData.holes.length}</span>
                {formData.holes.length > 0 && (
                  <span className="text-sm text-gray-400 ml-2">
                    (PAR {formData.holes.reduce((sum, h) => sum + h.par, 0)})
                  </span>
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-400">Men&apos;s Tees: </span>
                <span className="text-sm text-brand-dark">
                  {formData.menTees.length > 0 
                    ? formData.menTees.map(t => t.name || '(unnamed)').join(', ')
                    : 'None'}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-400">Women&apos;s Tees: </span>
                <span className="text-sm text-brand-dark">
                  {formData.womenTees.length > 0 
                    ? formData.womenTees.map(t => t.name || '(unnamed)').join(', ')
                    : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            {/* Tab Headers */}
            <div className="border-b border-gray-100">
              <nav className="flex -mb-px">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`py-4 px-6 text-sm font-medium border-b-2 ${
                      activeTab === tab.key
                        ? 'border-brand text-brand'
                        : 'border-transparent text-gray-400 hover:text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Holes Tab */}
              {activeTab === 'holes' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-600">
                      Configure the holes for this course. Holes are automatically numbered.
                    </p>
                    <button
                      type="button"
                      onClick={addHole}
                      className="bg-brand text-white px-4 py-2 rounded hover:bg-brand/90"
                    >
                      Add Hole
                    </button>
                  </div>
                  {formData.holes.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No holes added yet. Click &quot;Add Hole&quot; to begin.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hole</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Handicap</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PAR</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.holes.map((hole, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{hole.number}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={hole.handicap}
                                  onChange={(e) => updateHole(index, 'handicap', parseInt(e.target.value) || 1)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-black text-sm"
                                  min="1"
                                  max="18"
                                  required
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={hole.par}
                                  onChange={(e) => updateHole(index, 'par', parseInt(e.target.value) || 3)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-black text-sm"
                                  min="3"
                                  max="6"
                                  required
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeHole(index)}
                                  className="text-danger-700 hover:text-danger-600"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Men's Tees Tab */}
              {activeTab === 'menTees' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-600">
                      Configure tee options for men players.
                    </p>
                    <button
                      type="button"
                      onClick={addMenTee}
                      className="bg-brand text-white px-4 py-2 rounded hover:bg-brand/90"
                    >
                      Add Tee
                    </button>
                  </div>
                  {formData.menTees.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No men&apos;s tees added yet. Click &quot;Add Tee&quot; to begin.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CR (Course Rating)</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slope</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.menTees.map((tee, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={tee.name}
                                  onChange={(e) => updateMenTee(index, 'name', e.target.value)}
                                  className="w-32 px-2 py-1 border border-gray-300 rounded text-black text-sm"
                                  placeholder="e.g., White"
                                  required
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={tee.cr}
                                  onChange={(e) => {
                                    const newValue = handleDecimalChange(e.target.value);
                                    if (newValue !== null) {
                                      updateMenTee(index, 'cr', newValue);
                                    }
                                  }}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-black text-sm"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={tee.slope}
                                  onChange={(e) => {
                                    const newValue = handleDecimalChange(e.target.value);
                                    if (newValue !== null) {
                                      updateMenTee(index, 'slope', newValue);
                                    }
                                  }}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-black text-sm"
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeMenTee(index)}
                                  className="text-danger-700 hover:text-danger-600"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Women's Tees Tab */}
              {activeTab === 'womenTees' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-600">
                      Configure tee options for women players.
                    </p>
                    <button
                      type="button"
                      onClick={addWomenTee}
                      className="bg-brand text-white px-4 py-2 rounded hover:bg-brand/90"
                    >
                      Add Tee
                    </button>
                  </div>
                  {formData.womenTees.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No women&apos;s tees added yet. Click &quot;Add Tee&quot; to begin.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CR (Course Rating)</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slope</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.womenTees.map((tee, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={tee.name}
                                  onChange={(e) => updateWomenTee(index, 'name', e.target.value)}
                                  className="w-32 px-2 py-1 border border-gray-300 rounded text-black text-sm"
                                  placeholder="e.g., Red"
                                  required
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={tee.cr}
                                  onChange={(e) => {
                                    const newValue = handleDecimalChange(e.target.value);
                                    if (newValue !== null) {
                                      updateWomenTee(index, 'cr', newValue);
                                    }
                                  }}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-black text-sm"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={tee.slope}
                                  onChange={(e) => {
                                    const newValue = handleDecimalChange(e.target.value);
                                    if (newValue !== null) {
                                      updateWomenTee(index, 'slope', newValue);
                                    }
                                  }}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-black text-sm"
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeWomenTee(index)}
                                  className="text-danger-700 hover:text-danger-600"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/courses')}
              className="px-6 py-2 text-gray-400 bg-gray-50 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-brand text-white rounded-md hover:bg-brand/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
