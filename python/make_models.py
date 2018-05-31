from keras.models import load_model
from keras.models import Model
from keras.layers import Input
import tensorflowjs as tfjs
import sys


class ModelMaker():
    def __init__(self, modelFN):
        self.modelFN = modelFN
        self.seq2seq_Model = load_model(self.modelFN)
        self.encoder_model = self.get_encoder_model(self.seq2seq_Model)
        self.decoder_model = self.get_decoder_model(self.seq2seq_Model)

    def get_encoder_model(self, model):
        encoder = model.get_layer('Encoder-Model')

        # tensorflow js issue
        for layer in encoder.layers:
            name = layer.name
            layer.name = ''.join([name[0]] + [word.capitalize() for word in name[1:].split('-')])

        return encoder

    def get_decoder_model(self, model):
        latent_dim = model.get_layer('Title-Word-Embedding').output_shape[-1]
    
        decoder_inputs = model.get_layer('Decoder-Input').input
        dec_emb = model.get_layer('Title-Word-Embedding')(decoder_inputs)
        dec_bn = model.get_layer('Decoder-BatchNorm-1')(dec_emb)

        gru_inference_state_input = Input(shape=(latent_dim,), name='hidden_state_input')

        gru_out, gru_state_out = model.get_layer('Decoder-GRU')([dec_bn, gru_inference_state_input]) 

        dec_bn2 = model.get_layer('Decoder-BatchNorm-2')(gru_out)

        dense_out = model.get_layer('Final-Output-Dense')(dec_bn2)

        decoder_model = Model([decoder_inputs, gru_inference_state_input],
                              [dense_out, gru_state_out])

        # tensorflow js issue
        for layer in decoder_model.layers:
            name = layer.name
            layer.name = ''.join([name[0]] + [word.capitalize() for word in name[1:].split('-')])

        return decoder_model

    def make(self):
        tfjs.converters.save_keras_model(self.encoder_model, 'encoder')
        tfjs.converters.save_keras_model(self.decoder_model, 'decoder')
    
if __name__ == "__main__":
    print('Processing model file: {}'.format(sys.argv[1]))
    maker = ModelMaker(sys.argv[1])
    maker.make()
    