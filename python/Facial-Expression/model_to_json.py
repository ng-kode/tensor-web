import tensorflowjs as tfjs
from keras.models import load_model
import sys

def main(argv):
    if len(argv) < 2:
        print('Please provide model filename')
        return

    if len(argv) < 3:
        print('Please provide target directory')
        return

    FN = argv[1]
    target_dir = argv[2]

    model = load_model(FN)
    print('Exporting to directory {}'.format(target_dir))
    tfjs.converters.save_keras_model(model, target_dir)
    print('ok')

if __name__ == '__main__':
    main(sys.argv)
