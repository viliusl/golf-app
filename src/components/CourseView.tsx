'use client';

import { useState } from 'react';

interface Hole {
  number: number;
  handicap: number;
  par: number;
}

interface Tee {
  name: string;
  cr: number;
  slope: number;
}

interface CourseData {
  _id?: string;
  name: string;
  address: string;
  holes?: Hole[];
  menTees?: Tee[];
  womenTees?: Tee[];
}

type TabType = 'holes' | 'menTees' | 'womenTees';

interface CourseViewProps {
  course: CourseData;
  title?: string;
  onClose?: () => void;
}

export default function CourseView({ course, title, onClose }: CourseViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('holes');

  const holes = course.holes || [];
  const menTees = course.menTees || [];
  const womenTees = course.womenTees || [];

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'holes', label: 'Holes', count: holes.length },
    { key: 'menTees', label: "Men's Tees", count: menTees.length },
    { key: 'womenTees', label: "Women's Tees", count: womenTees.length },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold text-black">{title || course.name}</h2>
          {title && <p className="text-lg text-gray-700 mt-1">{course.name}</p>}
          <p className="text-sm text-gray-500 mt-1">{course.address}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {/* Course Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-700">Holes: </span>
            <span className="text-sm text-black">{holes.length}</span>
            {holes.length > 0 && (
              <span className="text-sm text-gray-500 ml-2">
                (PAR {holes.reduce((sum, h) => sum + h.par, 0)})
              </span>
            )}
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Men&apos;s Tees: </span>
            <span className="text-sm text-black">
              {menTees.length > 0 
                ? menTees.map(t => t.name).join(', ')
                : 'None'}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Women&apos;s Tees: </span>
            <span className="text-sm text-black">
              {womenTees.length > 0 
                ? womenTees.map(t => t.name).join(', ')
                : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Tab Headers */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 px-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* Holes Tab */}
          {activeTab === 'holes' && (
            <div>
              {holes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No holes configured.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hole</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Handicap</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PAR</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {holes.map((hole, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{hole.number}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{hole.handicap}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{hole.par}</td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="bg-gray-50 font-medium">
                        <td className="px-4 py-2 text-sm text-gray-900">Total</td>
                        <td className="px-4 py-2 text-sm text-gray-900">-</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{holes.reduce((sum, h) => sum + h.par, 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Men's Tees Tab */}
          {activeTab === 'menTees' && (
            <div>
              {menTees.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No men&apos;s tees configured.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CR (Course Rating)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slope</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {menTees.map((tee, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{tee.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{tee.cr}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{tee.slope}</td>
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
              {womenTees.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No women&apos;s tees configured.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CR (Course Rating)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slope</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {womenTees.map((tee, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{tee.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{tee.cr}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{tee.slope}</td>
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
    </div>
  );
}
