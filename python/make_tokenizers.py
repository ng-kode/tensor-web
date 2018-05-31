import dill as dpickle
import json
import sys


class TokenizerMaker():
    def __init__(self, tk_body_path, tk_title_path):
        self.tk_body_path = tk_body_path
        self.tk_title_path = tk_title_path


    def make(self):
        with open(self.tk_body_path, 'rb') as fpkl, open('tk_body.word2idx.json', 'w') as fjson:
            data = dpickle.load(fpkl).word_index
            json.dump(data, fjson)

        with open(self.tk_title_path, 'rb') as fpkl, open('tk_title.word2idx.json', 'w') as fjson:
            data = dpickle.load(fpkl).word_index
            json.dump(data, fjson)


def main(argv):
    print('tk_body path: {}'.format(argv[1]))
    print('tk_title path: {}'.format(argv[2]))
    tk_maker = TokenizerMaker(argv[1], argv[2])
    tk_maker.make()

if __name__ == '__main__':
    main(sys.argv)