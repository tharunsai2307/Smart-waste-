import glob
import os
import subprocess

src_files = [f for f in glob.glob('src/*.c') if 'main.c' not in f.replace('\\', '/') and 'server_main.c' not in f.replace('\\', '/')]

tests = [
    'scratch/test_hub.c',
    'scratch/test_phase3.c',
    'scratch/test_phase4.c',
    'tests/test_phase5.c',
    'tests/test_phase6.c'
]

for test in tests:
    print(f"\\n--- RUNNING TEST: {test} ---")
    exe = test.replace('.c', '.exe').split('/')[-1]
    
    cmd = ['gcc', test] + src_files + ['-Iinclude', '-Wall', '-Wextra', '-o', exe, '-lws2_32']
    
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"COMPILATION FAILED:\\n{res.stderr}")
        continue
    
    run_res = subprocess.run([f'.\\{exe}'], capture_output=True, text=True)
    print(run_res.stdout)
    if run_res.stderr:
        print("ERRORS:", run_res.stderr)
