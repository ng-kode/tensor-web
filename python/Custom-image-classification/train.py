import os
import numpy as np
from keras import models
from keras import layers
from keras import optimizers
from keras.callbacks import ModelCheckpoint
from extract_features import extract_features
from plot_results import plot_results

base_dir = 'photos'
train_dir = os.path.join(base_dir, 'train')
test_dir = os.path.join(base_dir, 'test')

train_features, train_labels = extract_features(train_dir, 20)
test_features, test_labels = extract_features(test_dir, 10)

print(train_features.shape)
print(train_labels.shape)

train_features = np.reshape(train_features, (20, 7 * 7 * 1024))
test_features = np.reshape(test_features, (10, 7 * 7 * 1024))

batch_size = 2

model = models.Sequential()
model.add(layers.Dense(256, activation='relu', input_dim=7 * 7 * 1024))
model.add(layers.Dropout(0.5))
model.add(layers.Dense(3, activation='softmax'))

model.compile(optimizer=optimizers.RMSprop(lr=2e-5),
              loss='categorical_crossentropy',
              metrics=['acc'])

checkpointer = ModelCheckpoint('model.{epoch:02d}-{val_acc:.2f}.hdf5')

history = model.fit(train_features, train_labels,
                    epochs=1,
                    batch_size=batch_size,
                    validation_data=(test_features, test_labels),
                    callbacks=[checkpointer])

plot_results(history)