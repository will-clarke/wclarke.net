all: build

build: grab-posts-and-stories regenerate-stories-index
	@echo Running "sssg" - may take a while...
	@ ./ssssg || ssssg || echo "please put the "ssssg" file onto your path (make install)"
	@rm -rf src/stories

grab-posts-and-stories:
	$(eval tmpDir := $(shell mktemp -d))
	@mkdir -p src/stories
	@mkdir -p src/posts
	@git clone git@git.sr.ht:~will-clarke/notes $(tmpDir) ||  rm -rf $(tmpDir)
	@cp -r $(tmpDir)/stories/published/* src/stories || rm -rf $(tmpDir)
	@cp -r $(tmpDir)/blog/published/* src/posts || rm -rf $(tmpDir)
	@rm -rf $(tmpDir)

install:
	@curl https://git.sr.ht/~will-clarke/super-simple-static-site-generator/blob/master/ssssg -o ssssg && chmod +x ssssg
	@echo -e "\n\n'ssssg' shell script downloaded to the current directory.\n\nEither keep it here or put it somewhere on your PATH. :)"
	@echo -e "\n\nYou may also need pandoc installed"

publish:
	@echo "This one's kind of up to you, mate."
	@echo "Everything you'll need will be in the 'dst' directory."

regenerate-stories-index:
	@echo Regenerating story links
	@./scripts/story-links.sh
	
run-docker:
	docker build -t website .
	docker run --rm --name my-website -p 8080:80 website

push:
	docker tag website willclarke/website
	docker push willclarke/website

run-local: build run-docker
	open http://localhost:8080
