import os

src_dir = "src"
for filename in os.listdir(src_dir):
    if filename.endswith(".c"):
        filepath = os.path.join(src_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        new_content = content.replace(r"\'\0\'", r"'\0'")
        if new_content != content:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Fixed {filepath}")
