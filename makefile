build: copy-cv regenerate-stories-index
	@echo Running "sssg" - may take a while...
	@ssssg || ./ssssg || echo "please put the "ssssg" file onto your path"

install:
	@curl https://git.sr.ht/~will-clarke/super-simple-static-site-generator/blob/master/ssssg -o ssssg && chmod +x ssssg
	@echo -e "\n\n'ssssg' shell script downloaded to the current directory.\n\nEither keep it here or put it somewhere on your PATH. :)"

publish:
	@echo "This one's kind of up to you, mate."
	@echo "Everything you'll need will be in the 'dst' directory."

regenerate-stories-index:
	@echo Regenerating story links
	@./scripts/story-links.sh
	
copy-cv:
	@echo Updating cv
	curl https://git.sr.ht/~will-clarke/cv/blob/master/will-clarke.html -o src/cv.html