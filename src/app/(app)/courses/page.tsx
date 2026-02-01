'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Course } from '@/app/api/courses/route';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (course: Course) => {
    setCourseToDelete(course);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;

    try {
      const response = await fetch(`/api/courses?id=${courseToDelete._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to delete course');
      }

      setIsDeleteModalOpen(false);
      setCourseToDelete(null);
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete course');
    }
  };

  // Filter courses based on search term
  const filteredCourses = searchTerm
    ? courses.filter(course => 
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : courses;

  return (
    <main className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-brand-dark">Courses</h1>
          <Link
            href="/courses/add"
            className="bg-brand text-white py-2 px-4 rounded-md hover:bg-brand/90 transition-colors"
          >
            Add Course
          </Link>
        </div>

        {/* Search Box */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-brand text-brand-dark"
            />
            <svg 
              className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-danger-50 text-danger-700 rounded-md">
            {error}
          </div>
        )}

        {/* Courses Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {loading ? (
            <p className="text-brand-dark">Loading courses...</p>
          ) : courses.length === 0 ? (
            <p className="text-brand-dark">No courses found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Address
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Holes / PAR
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Men&apos;s Tees
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Women&apos;s Tees
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredCourses.map((course) => (
                    <tr key={course._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/courses/${course._id}/edit`}
                          className="text-sm font-medium text-brand hover:text-brand/80 hover:underline"
                        >
                          {course.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative group">
                          <div className="text-sm text-brand-dark max-w-[200px] truncate">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(course.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand hover:text-brand/80 hover:underline"
                            >
                              {course.address}
                            </a>
                          </div>
                          <div className="absolute z-10 invisible group-hover:visible bg-gray-600 text-white text-xs rounded py-2 px-3 -top-2 left-0 transform -translate-y-full max-w-[300px] whitespace-normal shadow-lg">
                            {course.address}
                            <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-600"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-brand-dark">
                          {course.holes?.length || 0}
                          {course.holes && course.holes.length > 0 && (
                            <span className="text-gray-400 ml-1">
                              / {course.holes.reduce((sum, h) => sum + (h.par || 0), 0)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative group">
                          <div className="text-sm text-brand-dark max-w-[120px] truncate cursor-default">
                            {course.menTees?.map(t => t.name).join(', ') || '-'}
                          </div>
                          {course.menTees && course.menTees.length > 0 && (
                            <div className="absolute z-10 invisible group-hover:visible bg-gray-600 text-white text-xs rounded py-2 px-3 -top-2 left-0 transform -translate-y-full max-w-[250px] whitespace-normal shadow-lg">
                              {course.menTees.map(t => t.name).join(', ')}
                              <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-600"></div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative group">
                          <div className="text-sm text-brand-dark max-w-[120px] truncate cursor-default">
                            {course.womenTees?.map(t => t.name).join(', ') || '-'}
                          </div>
                          {course.womenTees && course.womenTees.length > 0 && (
                            <div className="absolute z-10 invisible group-hover:visible bg-gray-600 text-white text-xs rounded py-2 px-3 -top-2 left-0 transform -translate-y-full max-w-[250px] whitespace-normal shadow-lg">
                              {course.womenTees.map(t => t.name).join(', ')}
                              <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-600"></div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/courses/${course._id}/edit`}
                          className="text-brand hover:text-brand/80"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(course)}
                          className="text-danger-700 hover:text-danger-600 ml-4"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && courseToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-brand-dark">Delete Course</h2>
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setCourseToDelete(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <p className="mb-4 text-gray-400">
                Are you sure you want to delete the course &quot;{courseToDelete.name}&quot;?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setCourseToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:bg-gray-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="bg-danger-600 text-white py-2 px-4 rounded-md hover:bg-danger-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
