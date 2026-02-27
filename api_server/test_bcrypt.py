import sys
sys.path.insert(0, '/Users/frivajica/Projects/lead-extractor/api_server')
from passlib.hash import bcrypt

try:
    print("Testing 71 chars")
    bcrypt.hash("a" * 71)
    print("Testing 72 chars")
    bcrypt.hash("a" * 72)
    print("Testing 73 chars")
    bcrypt.hash("a" * 73)
except Exception as e:
    print("Error:", e)
