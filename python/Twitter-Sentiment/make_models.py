from keras.models import load_model
from keras.models import Model
from keras.layers import Input
import tensorflowjs as tfjs
import sys


class ModelMaker():
    def __init__(self, modelFN):
        self.modelFN = modelFN
        model = load_model(self.modelFN)

        # tensorflow js issue
        for layer in model.layers:
            name = layer.name
            layer.name = ''.join([name[0]] + [word.capitalize() for word in name[1:].split('-')])

        self.model = model

    def make(self):
        tfjs.converters.save_keras_model(self.model, 'model')
    
if __name__ == "__main__":
    print('Processing model file: {}'.format(sys.argv[1]))
    maker = ModelMaker(sys.argv[1])
    maker.make()
    