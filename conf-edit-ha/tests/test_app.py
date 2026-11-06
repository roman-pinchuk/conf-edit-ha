import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import build_file_tree


class BuildFileTreeTests(unittest.TestCase):
    def test_includes_hidden_directories_and_supported_files(self):
        with TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            hidden_dir = root / '..include'
            hidden_dir.mkdir()
            (hidden_dir / '.secrets.yaml').write_text('secret: value', encoding='utf-8')
            (hidden_dir / 'notes.txt').write_text('not supported', encoding='utf-8')

            tree = build_file_tree(root)

            self.assertEqual(len(tree), 1)
            self.assertEqual(tree[0]['name'], '..include')
            self.assertEqual(tree[0]['type'], 'directory')
            self.assertEqual(tree[0]['children'][0]['name'], '.secrets.yaml')

    def test_skips_ignored_directories(self):
        with TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            for directory_name in ('.git', '__pycache__', 'node_modules'):
                directory = root / directory_name
                directory.mkdir()
                (directory / 'ignored.yaml').write_text('ignored: true', encoding='utf-8')

            tree = build_file_tree(root)

            self.assertEqual(tree, [])


if __name__ == '__main__':
    unittest.main()
