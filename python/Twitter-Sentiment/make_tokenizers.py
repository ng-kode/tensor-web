import dill as dpickle
import json
import sys


class TokenizerMaker():
    def __init__(self, tk_path):
        self.tk_path = tk_path

    def make(self):
        with open(self.tk_path, 'rb') as fpkl, open('word_index.json', 'w') as fjson:
            data = dpickle.load(fpkl).word_index
            json.dump(data, fjson)

def main(argv):
    print('tk path: {}'.format(argv[1]))
    tk_maker = TokenizerMaker(argv[1])
    tk_maker.make()

if __name__ == '__main__':
    main(sys.argv)