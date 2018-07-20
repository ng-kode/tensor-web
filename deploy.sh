git checkout gh-pages
git merge master
rm README.md			
rm makeyourown_20180719.gif	
rm -rf public/
rm -rf src/
rm .vscode/
rm .gitignore
rm app.json
rm package.json
rm scripts
rm package-lock.json
rm recognise_20180719.gif
rm static.json
git add .
git commit -m "deploy"
git push origin gh-pages