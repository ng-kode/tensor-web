import matplotlib.pyplot as plt

def plot_results(history):
    acc = history.history['acc']
    val_acc = history.history['val_acc']
    loss = history.history['loss']
    val_loss = history.history['val_loss']

    epochs = range(1, len(acc) + 1)

    f, axarr = plt.subplots(1, 2, figsize=(18, 6))
    axarr[0].plot(epochs, acc, 'bo', label='Training acc')
    axarr[0].plot(epochs, val_acc, 'b', label='Validation acc')
    axarr[0].set_title('Training and validation accuracy')
    axarr[0].legend()

    axarr[1].plot(epochs, loss, 'bo', label='Training loss')
    axarr[1].plot(epochs, val_loss, 'b', label='Validation loss')
    axarr[1].set_title('Training and validation loss')
    axarr[1].legend()

    f.show()