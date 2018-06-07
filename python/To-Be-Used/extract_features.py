import os
import numpy as np
from keras.preprocessing.image import ImageDataGenerator
from keras.applications.mobilenet import MobileNet

IMAGE_SIZE = 224
conv_base = MobileNet(weights='imagenet', include_top=False, input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3))

datagen = ImageDataGenerator(rescale=1./255)
batch_size = 2

def extract_features(directory, sample_count, ndim):
    features = np.zeros(shape=(sample_count, 7, 7, ndim)) # mobile net output shape
    labels = np.zeros(shape=(sample_count, 3))
    generator = datagen.flow_from_directory(
        directory,
        target_size=(IMAGE_SIZE, IMAGE_SIZE),
        batch_size=batch_size,
        class_mode='categorical')
    i = 0
    for inputs_batch, labels_batch in generator:
        features_batch = conv_base.predict(inputs_batch)
        features[i * batch_size : (i + 1) * batch_size] = features_batch
        labels[i * batch_size : (i + 1) * batch_size] = labels_batch
        i += 1
        if i * batch_size >= sample_count:
            break
    return features, labels
