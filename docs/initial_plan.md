The goal of this project is to make an ear training app for music listening skills.


The idea is to establish a tonic by playing a drone. Then play a note, and the user selects the correct note relative to the tonic. After the user picks it plays the note again and highlights the correct answer, then plays another note. The drone keeps playing. when the user selects "change tonic" the drone fades and a new one is picked at random.


The UI will have a circle of fifths.

The note names are going to be weird:

C = Ne, Eb=Pe, Gb = Ke, A = Je
D = Ko, F = Jo, Ab = No, B = Po
G = Pa, Bb = Ka, Db = Ja, E = Na

Can have a toggle to switch between traditional names and these names (Aug Dim)

Whatever the tonic is will be at the top of the circle of fifths. 

The notes have colors, 
C = Ne, Eb=Pe, Gb = Ke, A = Je = rgb(215 204 59)

G = Pa, Bb = Ka, Db = Ja, E = Na = rgb(216 37 84)

D = Ko, F = Jo, Ab = No, B = Po = rgb(77 162 210)

I'd like to use LayerCake for the container that holds the circle of fifths so there can be easily aligned SVG, canvas,  and html elements.

The notes will be arranged in a circle of fifths with the 12 o'clock position being the tonic. The absolute note names will be shown, as well as the intervals they represent.

The intervals will be named:
1, b9, 2, b3, 3, 4, b5, 5, b6, 6, b7, 7

The drone will be produced 4 octaves with 2 voices per octave (8 total voices). For this we'll use tone.js and the two voices will be an am synth and an fm synth. There'd be slowly evolving lfos that control the volume of each voice, with some care taken to make sure the total volume stays in a nice range the whole time. with tone.js delay and reverb on the mix.

I'd like to start with a simple drone test page that has a button to select the key and it produces a drone. There should be a ui to control the lfos and parameters of the synths in such a way that I can explore and then we can bake the parameters I choose into the app.


