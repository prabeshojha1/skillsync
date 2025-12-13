// Color mapping for badges and tags

export function getLanguageColor(language: string): string {
  const colorMap: Record<string, string> = {
    'JavaScript': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
    'TypeScript': 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
    'Python': 'bg-yellow-400/20 text-yellow-800 dark:text-yellow-300 border-yellow-400/30',
    'Java': 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30',
    'C++': 'bg-blue-600/20 text-blue-800 dark:text-blue-300 border-blue-600/30',
    'C#': 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30',
    'Go': 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
    'Rust': 'bg-orange-600/20 text-orange-800 dark:text-orange-300 border-orange-600/30',
    'Swift': 'bg-orange-400/20 text-orange-700 dark:text-orange-400 border-orange-400/30',
    'Kotlin': 'bg-purple-600/20 text-purple-800 dark:text-purple-300 border-purple-600/30',
    'PHP': 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
    'Ruby': 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30',
    'Scala': 'bg-red-600/20 text-red-800 dark:text-red-300 border-red-600/30',
    'R': 'bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-500/30',
    'MATLAB': 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30',
    'Other': 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30',
  }
  return colorMap[language] || 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30'
}

export function getCompanyTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    'Software Engineering': 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
    'Cybersecurity': 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30',
    'Data Science': 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30',
    'Machine Learning / AI': 'bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-500/30',
    'Web Development': 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30',
    'Mobile Development': 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
    'DevOps': 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30',
    'Cloud Computing': 'bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-500/30',
    'Game Development': 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30',
    'Embedded Systems': 'bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-500/30',
    'Other': 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30',
  }
  return colorMap[type] || 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30'
}

export function getTechnologyColor(tech: string): string {
  const colorMap: Record<string, string> = {
    'React': 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
    'Node.js': 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30',
    'Next.js': 'bg-gray-900/20 text-gray-900 dark:text-gray-100 border-gray-900/30',
    'TypeScript': 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
    'JavaScript': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
    'Vue.js': 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    'Python': 'bg-yellow-400/20 text-yellow-800 dark:text-yellow-300 border-yellow-400/30',
    'PostgreSQL': 'bg-blue-600/20 text-blue-800 dark:text-blue-300 border-blue-600/30',
    'MongoDB': 'bg-green-600/20 text-green-800 dark:text-green-300 border-green-600/30',
    'Stripe': 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
    'Socket.io': 'bg-black/20 text-black dark:text-white border-black/30',
    'OpenWeather API': 'bg-blue-400/20 text-blue-700 dark:text-blue-400 border-blue-400/30',
  }
  return colorMap[tech] || 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30'
}
