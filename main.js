const express = require("express");
const app = express();
const { program } = require("commander");
const fsp = require("node:fs/promises");
const path = require('node:path');
const multer = require('multer');

// функція повністю займається параметрами, повертає об'єкт з ними
function preparing() {
    // опис параметрів програми
    program
        .option("-h, --host <value>", "Host location")
        .option("-p, --port <value>", "Port location")
        .option("-c, --cashe <value>", "Cashe location");
    // парсинг тих параметрів
    program.parse()

    // отримання об'єкта, для зручного одержання параметрів
	const options = program.opts();

	// перевірка параметрів на правильність
	// перевірка на наявність обов'язкових параметрів
	if (!options.host || !options.port || !options.cashe) {
		throw Error("Please, specify necessary param");
	}

	return options;	
}

// глобальна(фу) змінна з параметрами
const options = preparing();
const host = options.host;
const port = options.port;
const cashe = options.cashe;
const fullDataFileName = path.join(cashe, "info.json"); // повний шлях до файлу з нотатками
let dataJson = []; // список об'єктів, що репрезентуватимуть нотатки
const saveDataJson = () => { // функція, щоб зберегти у файл поточний вміст dataJson
	fsp.writeFile(fullDataFileName, JSON.stringify(dataJson));
}

app.get("/notes/:note", (req, res) => {
	const note_name = req.params.note;
	const note = dataJson.find((nt) => nt.name == note_name); // знайти нотатку в списку
	if (note) {
		res.send(note.text); // як знайде нотатку, відсилає її текст
	}
	else {
		res.sendStatus(404); // як не знайде, 404
	}
});

app.use(express.text()); // мідлвар для обробки сирого тексту
app.put("/notes/:note", (req, res) => {
	const note_name = req.params.note; 
	let success = false; // маркер, чи знайшло необхідну нотатку в списку

	dataJson.forEach((element) => {
		if (element.name == note_name) {
			element.text = req.body;
			saveDataJson(); // сейв списку нотаток у файл
			res.end();
			success = true;
		}
	});
	if (!success) // якщо текст жодної нотатки не змінило, 404
		res.sendStatus(404);
});

app.delete("/notes/:note", (req, res) => {
	const note_name = req.params.note;
	const filtered = dataJson.filter((element) => element.name != note_name); //фільтрує список від всіх нотаток, чиє ім'я note_name
	if (JSON.stringify(dataJson) == JSON.stringify(filtered)) // якщо відфільтрований список такий ж, як і попередній (ніц не видалило)
		res.sendStatus(404)
	else {
		dataJson = filtered; // якщо щось там-таки видалило, встановлює відфільтрований за основний
		saveDataJson(); // сейв списку нотаток у файл
	}
	res.end();
});

app.get("/notes", (req, res) => {
	res.type("application/json");
	res.end(JSON.stringify(dataJson));	
});


app.use(multer().none()); // мідлвар для роботи з multipart/form-data, метод none() то значить файли відсутні, працюємо тільки з текстом
app.post("/write", (req, res) => {
	if (dataJson.find(element => req.body.note_name == element.name)) // якщо в списку вже є така нотатка
		res.sendStatus(400)
	else {
		dataJson.push({
			"name": req.body.note_name,
			"text": req.body.note,
		});
		saveDataJson();
		res.sendStatus(201);
	}
	res.end();
});

app.get("/UploadForm.html", (req, res) => {
	fsp.readFile("./UploadForm.html")
		.then((result) => {
			res.end(result);
		})
		.catch(() => {
			res.sendStatus(500);
			res.send("Наша форма вгубилася в часі й просторі.");
		});
});
//app.use(express.static(path.join(__dirname))); // вбудований мідлвар, що дозволяє напряму звертатись до файлів в поточній теці

function main() {
	dataText = fsp.readFile(fullDataFileName)
	.then((result) => {
		dataJson = JSON.parse(result);
	})
	.catch((err) => {
		// якщо файла з нотатками нема
		saveDataJson();
	})
	.finally(() => {
		app.listen(port, host, () => {
		console.log(`Сервер запущено за адресою http://${host}:${port}`);
		}); 
	});
}
main();