serve:
	hugo serve

deploy: compile
	hugo deploy

compile:
	hugo

open:
	open http://wclarke.net.s3-website.eu-west-2.amazonaws.com

updateCV:
	open https://github.com/will-clarke/cv/raw/master/will-clarke--ex-deliveroo.pdf
	mv ~/Downloads/will-clarke--ex-deliveroo.pdf static/will-clarke--ex-deliveroo.pdf
