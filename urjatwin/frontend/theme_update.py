import os
import glob

replacements = {
    'bg-white': 'bg-slate-900/60 backdrop-blur-md',
    'bg-slate-50': 'bg-slate-800/40',
    'border-slate-100': 'border-teal-500/20',
    'border-slate-200': 'border-slate-700',
    'border-slate-300': 'border-slate-600',
    'text-slate-900': 'text-white',
    'text-slate-800': 'text-slate-100',
    'text-slate-700': 'text-slate-300',
    'text-slate-600': 'text-slate-300',
    'text-slate-500': 'text-slate-400',
    'text-gray-900': 'text-white',
    'text-gray-500': 'text-slate-400',
    'shadow-sm': 'shadow-lg shadow-black/20',
    'bg-blue-50': 'bg-blue-900/20',
    'text-blue-800': 'text-blue-300',
    'bg-amber-50': 'bg-amber-900/20',
    'text-amber-800': 'text-amber-300',
    'bg-green-50': 'bg-green-900/20',
    'text-green-800': 'text-green-300',
    'bg-red-50': 'bg-red-900/20',
    'text-red-800': 'text-red-300',
    'text-teal-600': 'text-teal-400',
    'bg-teal-600': 'bg-teal-500',
    'bg-slate-100': 'bg-slate-800/60',
    'bg-navy-900': 'bg-slate-900/80',
    'bg-navy-950': 'bg-slate-900/90'
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements.items():
        # simple string replace (sufficient for these tailwind classes usually)
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

base_dir = r'd:\Hackathons\HackMatrix\urjatwin\frontend\src'
for root, dirs, files in os.walk(base_dir):
    for name in files:
        if name.endswith('.tsx'):
            process_file(os.path.join(root, name))

print('Done applying dark mode theme to TSX files.')
