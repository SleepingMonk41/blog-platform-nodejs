// Import required modules
import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import fs from 'fs';
import readLastLines from 'read-last-lines';

// Initialize Express app and set port
const app = express();
const port = 3000;

// Configure Multer storage for file uploads
// Defines where files are saved and how they are named
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        cb(null, 'public/data/uploads/')
    },
    filename: async function (req, file, cb) {
        const fileName = await nameCreater();
        cb(null, `${fileName}.png`)
    }
})

// Function to generate unique blog IDs
// Creates sequential IDs (blogID_1, blogID_2, etc.) and maintains them in list.txt
function nameCreater() {
    return new Promise(resolve => {
        const listFilePath = 'public/data/content/list.txt';
        var blogId = '';
        if (fs.existsSync(listFilePath)) {
            // Read the last line to get the most recent blog ID and increment id by 1
            const readLine = readLastLines.read(listFilePath, 1)
                .then((lines) => {
                    blogId = `blogID_${Number(lines.split('_')[1]) + Number(1)}`;
                });
            // After reading, append the new ID to the list file
            readLine.then((response) => {
                // append file
                fs.appendFileSync(listFilePath, `${blogId}\n`, 'utf-8');
                console.log('ID appended');
                resolve(blogId);
            });
        } else {
            // If list file doesn't exist, create it with the first ID
            blogId = 'blogID_1';
            fs.writeFileSync(listFilePath, `${blogId}\n`, 'utf-8');
            console.log('ID created');
            resolve(blogId);
        }

    })

}

// Function to fetch blog title from JSON data by blog ID
function titleFetcher(data, id) {
    return new Promise(resolve => {
        // Iterate through data to find matching blog ID
        Object.values(data).forEach(value => {
            Object.keys(value).forEach(key => {
                if (key === id) {
                     resolve(value[key]['blogTitle'])
                }
            });
        });
    });
}

// Function to fetch blog content from JSON data by blog ID
function contentFetcher(data, id) {
    return new Promise(resolve => {
        // Iterate through data to find matching blog ID
        Object.values(data).forEach(value => {
            Object.keys(value).forEach(key => {
                if (key === id) {
                    resolve(value[key]['blogContent'])
                }
            });
        });
    });
}


// Initialize Multer with the storage configuration
const upload = multer({ storage: storage });

// Set EJS as the view engine for rendering templates
app.set('view engine', 'ejs');
// Serve static files from the 'public' directory
app.use(express.static('public'));
// Parse URL-encoded request bodies (form data)
app.use(bodyParser.urlencoded({ extended: true }));

// Route: Display homepage with all blog posts
app.get('/', (req, res) => {
    try {
        // Read and parse the blog data from JSON file
        const datajson = fs.readFileSync('public/data/content/data.json');
        const data = JSON.parse(datajson);
        res.render('index.ejs', { jsonData: data });
    } catch {
         // If data file doesn't exist, render empty homepage
        res.render('index.ejs');
    }
});

// Route: Display the new blog post creation form
app.get('/new', (req, res) => {
    res.render('new_page.ejs');
});

// Route: Display individual blog post content by ID
app.get('/content/:id', async(req, res) => {
    // Read blog data from JSON file
    const datajson = fs.readFileSync('public/data/content/data.json');
    const data = JSON.parse(datajson);
    // Extract blog ID from URL parameter
    const id = req.params['id'];
    // Fetch title and content for the specific blog post
    const title = await titleFetcher(data, id);
    const content = await contentFetcher(data, id);
    // Render the content page with fetched data
    res.render('content.ejs', {title:title, content:content});
});

// Route: Handle new blog post submission with image upload
app.post('/new/submit', upload.single('blogImage'), async function (req, res) {
    // Extract filename without extension to use as blog ID
    var fileName = req.file.filename.split('.')[0];
    // Create JSON object with blog data
    const json_data = { [fileName]: { ...req.body } }
    console.log(json_data);

    try {
        // Try to read existing data file
        let datajson = fs.readFileSync('public/data/content/data.json');
        let data = JSON.parse(datajson);
        // Append new blog post to existing data
        data.push(json_data);
        fs.writeFileSync('public/data/content/data.json', JSON.stringify(data), 'utf-8');
    } catch (error) {
        // If data file doesn't exist, create new array with the blog post
        console.log(error)
        var jsonArray = [];
        jsonArray.push(json_data);
        fs.writeFileSync('public/data/content/data.json', JSON.stringify(jsonArray), 'utf-8');
    }

    // Redirect to homepage after submission
    res.render('index.ejs');
});

// Start the server and listen on specified port
app.listen(port, () => {
    console.log('Server is running on http://localhost:3000')
});
