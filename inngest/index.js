import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import { model } from "mongoose";
import sendEmail from "../configs/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// Inngest Function to save user data to a database
const syncUserCreation = inngest.createFunction(
    {id: 'sync-user-from-clerk'},
    {event: 'clerk/user.created'},
    async ({event})=>{
        const {id, first_name, last_name,email_addresses,image_url} = event.data;
        const userData ={
            _id: id,
            email: email_addresses[0].email_address,
            name: first_name+ ' '+ last_name,
            image: image_url,
        }
        await User.create(userData);
    }
)

// Inngest Function to delete user from database
const syncUserDeletion = inngest.createFunction(
    {id: 'delete-user-from-clerk'},
    {event: 'clerk/user.deleted'},
    async ({event})=>{
         const {id} = event.data;
         await User.findByIdAndDelete(id);
    }
)

// Inngest Function to update user from database
const syncUserUpdation = inngest.createFunction(
    {id: 'update-user-from-clerk'},
    {event: 'clerk/user.updated'},
    async ({event})=>{
        const {id, first_name, last_name,email_addresses,image_url} = event.data;
        const userData ={
            _id: id,
            email: email_addresses[0].email_address,
            name: first_name+ ' '+ last_name,
            image: image_url,
        }
        await User.findByIdAndUpdate(id,userData);
    }
)

// Inngest Function to cancel booking and release the seat of show after 10 minutes of booking created if payment is not made
const releaseSeatsAndDeleteBooking = inngest.createFunction(
    {id: 'release-seats-delete-booking'},
    {event: "app/checkpayment"},
    async ({event, step}) =>{
        const tenMinutesLater = new Date(Date.now() + 10*60*1000);
        await step.sleepUntil('wait-for-10-minutes', tenMinutesLater);

        await step.run('check-payment-status', async()=>{
            const bookingId = event.data.bookingId;
            const booking = await Booking.findById(bookingId);

            // If payment is not made, release seats and delete booking
            if(!booking.isPaid){
                const show = await Show.findById(booking.show);
                booking.bookedSeats.forEach((seat)=>{
                    delete show.occupiedSeats[seat];
                });
                show.markModified('occupiedSeats');
                await show.save();
                await Booking.findByIdAndDelete(booking._id);
            }
        })
    }
)

const sendBookingConfirmationEmail = inngest.createFunction(
    {id: "send-booking-confirmation-email"},
    {event: "app/show.booked"},
    async ({event , step}) =>{
        const {bookingId} = event.data;

        const booking = await Booking.findById(bookingId).populate({
            path: 'show',
            populate: {path: "movie", model:"Movie"}
        }).populate('user');

        await sendEmail({
            to: booking.user.email,
            subject: `Payment confirmation ${booking.show.movie.title} booked!`,
            body: `
            <!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">

<head>
	<title></title>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0"><!--[if mso]>
<xml><w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word"><w:DontUseAdvancedTypographyReadingMail/></w:WordDocument>
<o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml>
<![endif]--><!--[if !mso]><!-->
	<link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@100;200;300;400;500;600;700;800;900" rel="stylesheet" type="text/css"><!--<![endif]-->
	<style>
		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			padding: 0;
		}

		a[x-apple-data-detectors] {
			color: inherit !important;
			text-decoration: inherit !important;
		}

		#MessageViewBody a {
			color: inherit;
			text-decoration: none;
		}

		p {
			line-height: inherit
		}

		.desktop_hide,
		.desktop_hide table {
			mso-hide: all;
			display: none;
			max-height: 0px;
			overflow: hidden;
		}

		.image_block img+div {
			display: none;
		}

		sup,
		sub {
			font-size: 75%;
			line-height: 0;
		}

		.menu_block.desktop_hide .menu-links span {
			mso-hide: all;
		}

		.row-1 .column-1 .block-6 .button:hover,
		.row-4 .column-1 .block-5 .button:hover,
		.row-4 .column-2 .block-5 .button:hover,
		.row-4 .column-3 .block-5 .button:hover {
			background-color: transparent !important;
			border-bottom: 1px solid #f7484f !important;
			border-left: 1px solid #f7484f !important;
			border-right: 1px solid #f7484f !important;
			border-top: 1px solid #f7484f !important;
			color: #f7484f !important;
		}

		.row-2 .column-1 .block-3 .button:hover {
			background-color: transparent !important;
			border-bottom: 2px solid #000000 !important;
			border-left: 2px solid #000000 !important;
			border-right: 2px solid #000000 !important;
			border-top: 2px solid #000000 !important;
			color: #000000 !important;
		}

		@media (max-width:700px) {

			.desktop_hide table.icons-inner,
			.social_block.desktop_hide .social-table {
				display: inline-block !important;
			}

			.icons-inner {
				text-align: center;
			}

			.icons-inner td {
				margin: 0 auto;
			}

			.image_block div.fullWidth {
				max-width: 100% !important;
			}

			.mobile_hide {
				display: none;
			}

			.row-content {
				width: 100% !important;
			}

			.stack .column {
				width: 100%;
				display: block;
			}

			.mobile_hide {
				min-height: 0;
				max-height: 0;
				max-width: 0;
				overflow: hidden;
				font-size: 0px;
			}

			.desktop_hide,
			.desktop_hide table {
				display: table !important;
				max-height: none !important;
			}

			.row-1 .column-1 .block-5.paragraph_block td.pad>div,
			.row-2 .column-1 .block-2.paragraph_block td.pad>div,
			.row-3 .column-1 .block-3.paragraph_block td.pad>div,
			.row-4 .column-1 .block-4.paragraph_block td.pad>div,
			.row-4 .column-2 .block-4.paragraph_block td.pad>div,
			.row-4 .column-3 .block-4.paragraph_block td.pad>div,
			.row-5 .column-1 .block-3.paragraph_block td.pad>div,
			.row-6 .column-1 .block-2.paragraph_block td.pad>div,
			.row-6 .column-2 .block-3.paragraph_block td.pad>div {
				font-size: 19px !important;
			}

			.row-1 .column-1 .block-3.paragraph_block td.pad {
				padding: 25px 15px 15px !important;
			}

			.row-1 .column-1 .block-4.heading_block h1,
			.row-2 .column-1 .block-1.heading_block h2,
			.row-3 .column-1 .block-2.heading_block h2,
			.row-4 .column-1 .block-2.heading_block h2,
			.row-4 .column-2 .block-2.heading_block h2,
			.row-4 .column-3 .block-2.heading_block h2,
			.row-5 .column-1 .block-2.heading_block h2,
			.row-6 .column-1 .block-1.heading_block h2,
			.row-6 .column-2 .block-2.heading_block h2 {
				font-size: 49px !important;
			}

			.row-6 .column-2 .block-1.image_block td.pad {
				padding: 0 0 25px !important;
			}

			.row-6 .column-1 .block-3.paragraph_block td.pad>div,
			.row-6 .column-2 .block-4.paragraph_block td.pad>div {
				text-align: left !important;
				font-size: 16px !important;
			}

			.row-8 .column-2 .block-1.image_block td.pad {
				padding: 0 0 10px !important;
			}

			.row-8 .column-2 .block-2.image_block td.pad,
			.row-9 .column-1 .block-5.paragraph_block td.pad {
				padding: 10px 0 0 !important;
			}

			.row-9 .column-1 .block-4.menu_block .alignment {
				text-align: center !important;
			}

			.row-1 .row-content {
				padding: 0 10px !important;
			}

			.row-4 .row-content {
				padding: 0 20px !important;
			}

			.row-6 .row-content {
				padding-left: 15px !important;
				padding-right: 15px !important;
			}

			.row-8 .row-content {
				padding: 0 15px !important;
			}

			.row-2 .column-1 {
				padding: 35px 20px 0 !important;
			}

			.row-3 .column-1,
			.row-5 .column-1 {
				padding: 5px 20px !important;
			}

			.row-6 .column-1,
			.row-6 .column-2 {
				padding: 20px !important;
			}
		}
	</style><!--[if mso ]><style>sup, sub { font-size: 100% !important; } sup { mso-text-raise:10% } sub { mso-text-raise:-10% }</style> <![endif]-->
</head>

<body class="body" style="margin: 0; background-color: #000000; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
	<table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #000000;">
		<tbody>
			<tr>
				<td>
					<table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #000000; background-image: url('https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/shared_color.png'); background-repeat: no-repeat; background-size: cover;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-size: auto; color: #000000; width: 680px; margin: 0 auto;" width="680">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-top: 5px; vertical-align: top;">
													<div class="spacer_block block-1" style="height:30px;line-height:30px;font-size:1px;">&#8202;</div>
													<table class="image_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:25px;width:100%;padding-right:0px;padding-left:0px;">
																<div class="alignment" align="center">
																	<div style="max-width: 102px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/Logo_movie.png" style="display: block; height: auto; border: 0; width: 100%;" width="102" alt="your logo" title="your logo" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-3" width="100%" border="0" cellpadding="15" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad">
																<div style="color:#ffffff;direction:ltr;font-family:Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:1.2;text-align:center;mso-line-height-alt:19px;">
																	<p style="margin: 0;">July 19 – August 15</p>
																</div>
															</td>
														</tr>
													</table>
													<table class="heading_block block-4" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<h1 style="margin: 0; color: #f7484f; direction: ltr; font-family: Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif; font-size: 71px; font-weight: 700; letter-spacing: normal; line-height: 1.2; text-align: center; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 85px;">THE EDGE OF MIDNIGHT</h1>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-5" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:35px;padding-left:10px;padding-right:10px;padding-top:10px;">
																<div style="color:#ffffff;direction:ltr;font-family:Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif;font-size:24px;font-weight:300;letter-spacing:0px;line-height:1.5;text-align:center;mso-line-height-alt:36px;">
																	<p style="margin: 0;">Starring award-winning actors and directed by visionary filmmaker Ava Cross.</p>
																</div>
															</td>
														</tr>
													</table>
													<table class="button_block block-6" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:10px;text-align:center;">
																<div class="alignment" align="center"><a href="www.example.com" target="_blank" style="color:#000000;text-decoration:none;"><!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"  href="www.example.com"  style="height:50px;width:139px;v-text-anchor:middle;" arcsize="51%" fillcolor="#f7484f">
<v:stroke dashstyle="Solid" weight="1px" color="#f7484f"/>
<w:anchorlock/>
<v:textbox inset="0px,0px,0px,0px">
<center dir="false" style="color:#000000;font-family:sans-serif;font-size:20px">
<![endif]--><span class="button" style="background-color: #f7484f; border-bottom: 1px solid #f7484f; border-left: 1px solid #f7484f; border-radius: 27px; border-right: 1px solid #f7484f; border-top: 1px solid #f7484f; color: #000000; display: inline-block; font-family: Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif; font-size: 20px; font-weight: 400; mso-border-alt: none; padding-bottom: 5px; padding-top: 5px; padding-left: 20px; padding-right: 20px; text-align: center; width: auto; word-break: keep-all; letter-spacing: normal;"><span style="word-break: break-word; line-height: 40px;">Watch Now</span></span><!--[if mso]></center></v:textbox></v:roundrect><![endif]--></a></div>
															</td>
														</tr>
													</table>
													<table class="image_block block-7" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
																<div class="alignment" align="center">
																	<div class="fullWidth" style="max-width: 510px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/actor_main.png" style="display: block; height: auto; border: 0; width: 100%;" width="510" alt="a man and woman looking back" title="a man and woman looking back" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f7484f; background-size: auto;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-size: auto; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;" width="680">
										<tbody>
											<tr>
												<td class="column column-1" width="50%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-top: 5px; vertical-align: middle;">
													<table class="heading_block block-1" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<h2 style="margin: 0; color: #000000; direction: ltr; font-family: Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif; font-size: 59px; font-weight: 700; letter-spacing: normal; line-height: 1.2; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 71px;">The Last Heist</h2>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:10px;">
																<div style="color:#191919;direction:ltr;font-family:'Fira Sans', 'Lucida Sans Unicode', 'Lucida Grande', sans-serif;font-size:21px;font-weight:500;letter-spacing:0px;line-height:1.5;text-align:left;mso-line-height-alt:32px;">
																	<p style="margin: 0;">An aging thief assembles his old crew for one final score — a digital vault in a billionaire's AI-controlled fortress&nbsp;</p>
																</div>
															</td>
														</tr>
													</table>
													<table class="button_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:10px;text-align:left;">
																<div class="alignment" align="left"><a href="www.example.com" target="_blank" style="color:#f7484f;text-decoration:none;"><!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"  href="www.example.com"  style="height:46px;width:129px;v-text-anchor:middle;" arcsize="56%" fillcolor="#000000">
<v:stroke dashstyle="Solid" weight="1px" color="#000000"/>
<w:anchorlock/>
<v:textbox inset="0px,0px,0px,0px">
<center dir="false" style="color:#f7484f;font-family:sans-serif;font-size:18px">
<![endif]--><span class="button" style="background-color: #000000; border-bottom: 1px solid #000000; border-left: 1px solid #000000; border-radius: 27px; border-right: 1px solid #000000; border-top: 1px solid #000000; color: #f7484f; display: inline-block; font-family: Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif; font-size: 18px; font-weight: 400; mso-border-alt: none; padding-bottom: 5px; padding-top: 5px; padding-left: 20px; padding-right: 20px; text-align: center; width: auto; word-break: keep-all; letter-spacing: normal;"><span style="word-break: break-word; line-height: 36px;">Watch Now</span></span><!--[if mso]></center></v:textbox></v:roundrect><![endif]--></a></div>
															</td>
														</tr>
													</table>
												</td>
												<td class="column column-2" width="50%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-top: 5px; vertical-align: middle;">
													<table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="width:100%;">
																<div class="alignment" align="center">
																	<div style="max-width: 340px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/freepik__background__34564.png" style="display: block; height: auto; border: 0; width: 100%;" width="340" alt="a man holding a gun" title="a man holding a gun" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #000000;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;" width="680">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
													<div class="spacer_block block-1" style="height:60px;line-height:60px;font-size:1px;">&#8202;</div>
													<table class="heading_block block-2" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<h2 style="margin: 0; color: #ffffff; direction: ltr; font-family: Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif; font-size: 59px; font-weight: 700; letter-spacing: normal; line-height: 1.2; text-align: center; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 71px;">Trending movies</h2>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:10px;">
																<div style="color:#ffffff;direction:ltr;font-family:Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif;font-size:21px;font-weight:300;letter-spacing:0px;line-height:1.5;text-align:center;mso-line-height-alt:32px;">
																	<p style="margin: 0;">Catch the hottest films everyone’s talking about!</p>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table class="row row-4" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #000000; background-size: auto;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-size: auto; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;" width="680">
										<tbody>
											<tr>
												<td class="column column-1" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
													<table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:10px;width:100%;">
																<div class="alignment" align="center">
																	<div class="fullWidth" style="max-width: 206.667px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/Still_Here.jpeg" style="display: block; height: auto; border: 0; width: 100%; border-radius: 13px;" width="206.667" alt="a man in a red jacket holding a sword" title="a man in a red jacket holding a sword" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
													<table class="heading_block block-2" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<h2 style="margin: 0; color: #ffffff; direction: ltr; font-family: Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif; font-size: 24px; font-weight: 700; letter-spacing: normal; line-height: 1.2; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 29px;">Still Here</h2>
															</td>
														</tr>
													</table>
													<table class="image_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:10px;padding-left:10px;padding-right:10px;width:100%;">
																<div class="alignment" align="left">
																	<div style="max-width: 125px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/Rating_q.png" style="display: block; height: auto; border: 0; width: 100%;" width="125" alt="a yellow star on a black background" title="a yellow star on a black background" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-4" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:10px;">
																<div style="color:#ffffff;direction:ltr;font-family:Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif;font-size:15px;font-weight:300;letter-spacing:0px;line-height:1.5;text-align:left;mso-line-height-alt:23px;">
																	<p style="margin: 0;">In the aftermath of a tragic accident, a grieving father moves to a remote village</p>
																</div>
															</td>
														</tr>
													</table>
													<table class="button_block block-5" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:10px;text-align:left;">
																<div class="alignment" align="left"><a href="www.example.com" target="_blank" style="color:#000000;text-decoration:none;"><!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"  href="www.example.com"  style="height:46px;width:129px;v-text-anchor:middle;" arcsize="56%" fillcolor="#f7484f">
<v:stroke dashstyle="Solid" weight="1px" color="#f7484f"/>
<w:anchorlock/>
<v:textbox inset="0px,0px,0px,0px">
<center dir="false" style="color:#000000;font-family:sans-serif;font-size:18px">
<![endif]--><span class="button" style="background-color: #f7484f; border-bottom: 1px solid #f7484f; border-left: 1px solid #f7484f; border-radius: 27px; border-right: 1px solid #f7484f; border-top: 1px solid #f7484f; color: #000000; display: inline-block; font-family: Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif; font-size: 18px; font-weight: 400; mso-border-alt: none; padding-bottom: 5px; padding-top: 5px; padding-left: 20px; padding-right: 20px; text-align: center; width: auto; word-break: keep-all; letter-spacing: normal;"><span style="word-break: break-word; line-height: 36px;">Watch Now</span></span><!--[if mso]></center></v:textbox></v:roundrect><![endif]--></a></div>
															</td>
														</tr>
													</table>
												</td>
												<td class="column gap" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top;">
													<table style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 15px; height: 15px;" width="15" height="15"></table>
												</td>
												<td class="column column-2" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
													<table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:10px;width:100%;">
																<div class="alignment" align="center">
																	<div class="fullWidth" style="max-width: 206.667px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/super_hero.jpeg" style="display: block; height: auto; border: 0; width: 100%; border-radius: 13px;" width="206.667" alt="a woman wearing a mask" title="a woman wearing a mask" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
													<table class="heading_block block-2" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<h2 style="margin: 0; color: #ffffff; direction: ltr; font-family: Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif; font-size: 24px; font-weight: 700; letter-spacing: normal; line-height: 1.2; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 29px;">Deadline</h2>
															</td>
														</tr>
													</table>
													<table class="image_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:10px;padding-left:10px;padding-right:10px;width:100%;">
																<div class="alignment" align="left">
																	<div style="max-width: 125px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/Rating_q.png" style="display: block; height: auto; border: 0; width: 100%;" width="125" alt="a yellow star on a black background" title="a yellow star on a black background" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-4" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:10px;">
																<div style="color:#ffffff;direction:ltr;font-family:Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif;font-size:15px;font-weight:300;letter-spacing:0px;line-height:1.5;text-align:left;mso-line-height-alt:23px;">
																	<p style="margin: 0;">Every full moon, a magical marketplace appears in the forest</p>
																</div>
															</td>
														</tr>
													</table>
													<table class="button_block block-5" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:10px;text-align:left;">
																<div class="alignment" align="left"><a href="www.example.com" target="_blank" style="color:#000000;text-decoration:none;"><!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"  href="www.example.com"  style="height:46px;width:129px;v-text-anchor:middle;" arcsize="56%" fillcolor="#f7484f">
<v:stroke dashstyle="Solid" weight="1px" color="#f7484f"/>
<w:anchorlock/>
<v:textbox inset="0px,0px,0px,0px">
<center dir="false" style="color:#000000;font-family:sans-serif;font-size:18px">
<![endif]--><span class="button" style="background-color: #f7484f; border-bottom: 1px solid #f7484f; border-left: 1px solid #f7484f; border-radius: 27px; border-right: 1px solid #f7484f; border-top: 1px solid #f7484f; color: #000000; display: inline-block; font-family: Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif; font-size: 18px; font-weight: 400; mso-border-alt: none; padding-bottom: 5px; padding-top: 5px; padding-left: 20px; padding-right: 20px; text-align: center; width: auto; word-break: keep-all; letter-spacing: normal;"><span style="word-break: break-word; line-height: 36px;">Watch Now</span></span><!--[if mso]></center></v:textbox></v:roundrect><![endif]--></a></div>
															</td>
														</tr>
													</table>
												</td>
												<td class="column gap" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top;">
													<table style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 15px; height: 15px;" width="15" height="15"></table>
												</td>
												<td class="column column-3" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
													<table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:10px;width:100%;">
																<div class="alignment" align="center">
																	<div class="fullWidth" style="max-width: 206.667px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/war_zone.jpeg" style="display: block; height: auto; border: 0; width: 100%; border-radius: 13px;" width="206.667" alt="a man running with guns" title="a man running with guns" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
													<table class="heading_block block-2" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<h2 style="margin: 0; color: #ffffff; direction: ltr; font-family: Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif; font-size: 24px; font-weight: 700; letter-spacing: normal; line-height: 1.2; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 29px;">Zero Hour</h2>
															</td>
														</tr>
													</table>
													<table class="image_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:10px;padding-left:10px;padding-right:10px;width:100%;">
																<div class="alignment" align="left">
																	<div style="max-width: 125px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/Rating_q.png" style="display: block; height: auto; border: 0; width: 100%;" width="125" alt="a yellow star on a black background" title="a yellow star on a black background" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-4" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:10px;">
																<div style="color:#ffffff;direction:ltr;font-family:Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif;font-size:15px;font-weight:300;letter-spacing:0px;line-height:1.5;text-align:left;mso-line-height-alt:23px;">
																	<p style="margin: 0;">A retired bomb expert is forced back into action when a terrorist plants</p>
																</div>
															</td>
														</tr>
													</table>
													<table class="button_block block-5" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:10px;text-align:left;">
																<div class="alignment" align="left"><a href="www.example.com" target="_blank" style="color:#000000;text-decoration:none;"><!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"  href="www.example.com"  style="height:46px;width:129px;v-text-anchor:middle;" arcsize="56%" fillcolor="#f7484f">
<v:stroke dashstyle="Solid" weight="1px" color="#f7484f"/>
<w:anchorlock/>
<v:textbox inset="0px,0px,0px,0px">
<center dir="false" style="color:#000000;font-family:sans-serif;font-size:18px">
<![endif]--><span class="button" style="background-color: #f7484f; border-bottom: 1px solid #f7484f; border-left: 1px solid #f7484f; border-radius: 27px; border-right: 1px solid #f7484f; border-top: 1px solid #f7484f; color: #000000; display: inline-block; font-family: Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif; font-size: 18px; font-weight: 400; mso-border-alt: none; padding-bottom: 5px; padding-top: 5px; padding-left: 20px; padding-right: 20px; text-align: center; width: auto; word-break: keep-all; letter-spacing: normal;"><span style="word-break: break-word; line-height: 36px;">Watch Now</span></span><!--[if mso]></center></v:textbox></v:roundrect><![endif]--></a></div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table class="row row-5" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;" width="680">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
													<div class="spacer_block block-1" style="height:40px;line-height:40px;font-size:1px;">&#8202;</div>
													<table class="heading_block block-2" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<h2 style="margin: 0; color: #ffffff; direction: ltr; font-family: Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif; font-size: 59px; font-weight: 700; letter-spacing: normal; line-height: 1.2; text-align: center; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 71px;"><span class="tinyMce-placeholder" style="word-break: break-word;">Upcoming movies</span></h2>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:10px;">
																<div style="color:#ffffff;direction:ltr;font-family:Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif;font-size:21px;font-weight:300;letter-spacing:0px;line-height:1.5;text-align:center;mso-line-height-alt:32px;">
																	<p style="margin: 0;">Get ready for the most anticipated blockbusters, epic adventures, and unforgettable stories hitting theaters and streaming soon!</p>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table class="row row-6" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #000000; background-size: auto;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-size: auto; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;" width="680">
										<tbody>
											<tr>
												<td class="column column-1" width="50%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 20px; padding-left: 20px; padding-right: 15px; padding-top: 20px; vertical-align: top;">
													<table class="heading_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:10px;padding-top:10px;text-align:center;width:100%;">
																<h2 style="margin: 0; color: #ffffff; direction: ltr; font-family: Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif; font-size: 24px; font-weight: 700; letter-spacing: normal; line-height: 1.2; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 29px;"><span class="tinyMce-placeholder" style="word-break: break-word;">Stormborn</span></h2>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-top:10px;">
																<div style="color:#ffffff;direction:ltr;font-family:Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif;font-size:15px;font-weight:300;letter-spacing:0px;line-height:1.5;text-align:left;mso-line-height-alt:23px;">
																	<p style="margin: 0;">When a shy street artist discovers he can summon lightning with his bare hands</p>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-top:10px;">
																<div style="color:#393d47;direction:ltr;font-family:Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:1.2;text-align:left;mso-line-height-alt:19px;">
																	<p style="margin: 0;"><a href="https://example.com/" target="_blank" style="text-decoration: underline; color: #f7484f;" rel="noopener"><u>Watch the trailer&gt;</u></a></p>
																</div>
															</td>
														</tr>
													</table>
													<table class="image_block block-4" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-top:25px;width:100%;padding-right:0px;padding-left:0px;">
																<div class="alignment" align="center">
																	<div class="fullWidth" style="max-width: 305px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/lighting_dark.jpeg" style="display: block; height: auto; border: 0; width: 100%; border-radius: 8px;" width="305" alt="a man walking in a dark alley with blue smoke" title="a man walking in a dark alley with blue smoke" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
												</td>
												<td class="column column-2" width="50%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 20px; padding-left: 15px; padding-right: 20px; padding-top: 20px; vertical-align: top;">
													<table class="image_block block-1 mobile_hide" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:25px;width:100%;padding-right:0px;padding-left:0px;">
																<div class="alignment" align="center">
																	<div class="fullWidth" style="max-width: 305px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/bull.jpeg" style="display: block; height: auto; border: 0; width: 100%; border-radius: 8px;" width="305" alt="a woman looking at a black horse" title="a woman looking at a black horse" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
													<table class="heading_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:10px;padding-top:10px;text-align:center;width:100%;">
																<h2 style="margin: 0; color: #ffffff; direction: ltr; font-family: Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif; font-size: 24px; font-weight: 700; letter-spacing: normal; line-height: 1.2; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 29px;"><span class="tinyMce-placeholder" style="word-break: break-word;">Thorn &amp; Crown</span></h2>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-top:10px;">
																<div style="color:#ffffff;direction:ltr;font-family:Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif;font-size:15px;font-weight:300;letter-spacing:0px;line-height:1.5;text-align:left;mso-line-height-alt:23px;">
																	<p style="margin: 0;">Bound by an ancient prophecy, a fearless princess and a colossal</p>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-4" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-top:10px;">
																<div style="color:#393d47;direction:ltr;font-family:Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:1.2;text-align:left;mso-line-height-alt:19px;">
																	<p style="margin: 0;"><a href="https://example.com/" target="_blank" style="text-decoration: underline; color: #f7484f;" rel="noopener"><u>Watch the trailer&gt;</u></a></p>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table class="row row-7" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;" width="680">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
													<div class="spacer_block block-1" style="height:15px;line-height:15px;font-size:1px;">&#8202;</div>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table class="row row-8" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 27px; color: #000000; width: 680px; margin: 0 auto;" width="680">
										<tbody>
											<tr>
												<td class="column column-1" width="66.66666666666667%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: middle;">
													<table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
																<div class="alignment" align="center">
																	<div class="fullWidth" style="max-width: 453.333px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/boxing.jpeg" style="display: block; height: auto; border: 0; width: 100%; border-radius: 11px;" width="453.333" alt="a woman with boxing gloves" title="a woman with boxing gloves" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
												</td>
												<td class="column gap" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top;">
													<table style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 15px; height: 15px;" width="15" height="15"></table>
												</td>
												<td class="column column-2" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: middle;">
													<table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:15px;padding-left:10px;padding-right:10px;width:100%;">
																<div class="alignment" align="center">
																	<div class="fullWidth" style="max-width: 206.667px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/mars.jpeg" style="display: block; height: auto; border: 0; width: 100%; border-radius: 11px;" width="206.667" alt="a spaceship flying over a city" title="a spaceship flying over a city" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
													<table class="image_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-left:10px;padding-right:10px;padding-top:10px;width:100%;">
																<div class="alignment" align="center">
																	<div class="fullWidth" style="max-width: 206.667px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/red_cape.jpeg" style="display: block; height: auto; border: 0; width: 100%; border-radius: 9px;" width="206.667" alt="a person in a red cape" title="a person in a red cape" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table class="row row-9" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;" width="680">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 30px; padding-left: 20px; padding-right: 20px; padding-top: 30px; vertical-align: top;">
													<div class="spacer_block block-1" style="height:30px;line-height:30px;font-size:1px;">&#8202;</div>
													<table class="image_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:10px;width:100%;padding-right:0px;padding-left:0px;">
																<div class="alignment" align="center">
																	<div style="max-width: 96px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/10111/Logo_movie.png" style="display: block; height: auto; border: 0; width: 100%;" width="96" alt title height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
													<table class="social_block block-3" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<div class="alignment" align="center">
																	<table class="social-table" width="144px" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block;">
																		<tr>
																			<td style="padding:0 2px 0 2px;"><a href="https://www.facebook.com/" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-white/facebook@2x.png" width="32" height="auto" alt="facebook" title="facebook" style="display: block; height: auto; border: 0;"></a></td>
																			<td style="padding:0 2px 0 2px;"><a href="https://www.twitter.com/" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-white/twitter@2x.png" width="32" height="auto" alt="twitter" title="twitter" style="display: block; height: auto; border: 0;"></a></td>
																			<td style="padding:0 2px 0 2px;"><a href="https://www.linkedin.com/" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-white/linkedin@2x.png" width="32" height="auto" alt="linkedin" title="linkedin" style="display: block; height: auto; border: 0;"></a></td>
																			<td style="padding:0 2px 0 2px;"><a href="https://www.instagram.com/" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-white/instagram@2x.png" width="32" height="auto" alt="instagram" title="instagram" style="display: block; height: auto; border: 0;"></a></td>
																		</tr>
																	</table>
																</div>
															</td>
														</tr>
													</table>
													<table class="menu_block block-4" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="color:#f2f2f2;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:14px;font-weight:400;text-align:center;">
																<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
																	<tr>
																		<td class="alignment" style="text-align:center;font-size:0px;">
																			<div class="menu-links"><!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style=""><tr style="text-align:center;"><![endif]--><!--[if mso]><td style="padding-top:10px;padding-right:10px;padding-bottom:10px;padding-left:10px"><![endif]--><a href="www.example.com" target="_self" style="mso-hide:false;padding-top:10px;padding-bottom:10px;padding-left:10px;padding-right:10px;display:inline-block;color:#f2f2f2;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:14px;text-decoration:none;letter-spacing:normal;">Genres</a><!--[if mso]></td><![endif]--><!--[if mso]><td style="padding-top:10px;padding-right:10px;padding-bottom:10px;padding-left:10px"><![endif]--><a href="www.example.com" target="_self" style="mso-hide:false;padding-top:10px;padding-bottom:10px;padding-left:10px;padding-right:10px;display:inline-block;color:#f2f2f2;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:14px;text-decoration:none;letter-spacing:normal;">Top Picks</a><!--[if mso]></td><![endif]--><!--[if mso]><td style="padding-top:10px;padding-right:10px;padding-bottom:10px;padding-left:10px"><![endif]--><a href="www.example.com" target="_self" style="mso-hide:false;padding-top:10px;padding-bottom:10px;padding-left:10px;padding-right:10px;display:inline-block;color:#f2f2f2;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:14px;text-decoration:none;letter-spacing:normal;">My List</a><!--[if mso]></td><![endif]--><!--[if mso]><td style="padding-top:10px;padding-right:10px;padding-bottom:10px;padding-left:10px"><![endif]--><a href="#" target="_self" style="mso-hide:false;padding-top:10px;padding-bottom:10px;padding-left:10px;padding-right:10px;display:inline-block;color:#f2f2f2;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:14px;text-decoration:none;letter-spacing:normal;">Unsubscribe</a><!--[if mso]></td><![endif]--><!--[if mso]></tr></table><![endif]--></div>
																		</td>
																	</tr>
																</table>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-5" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:5px;">
																<div style="color:#f2f2f2;direction:ltr;font-family:Fira Sans, Lucida Sans Unicode, Lucida Grande, sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:1.2;text-align:center;mso-line-height-alt:19px;">
																	<p style="margin: 0;">Information about your awesome company</p>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table class="row row-10" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 680px; margin: 0 auto;" width="680">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
													<table class="icons_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; text-align: center; line-height: 0;">
														<tr>
															<td class="pad" style="vertical-align: middle; color: #1e0e4b; font-family: 'Inter', sans-serif; font-size: 15px; padding-bottom: 5px; padding-top: 5px; text-align: center;"><!--[if vml]><table align="center" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-block;padding-left:0px;padding-right:0px;mso-table-lspace: 0pt;mso-table-rspace: 0pt;"><![endif]-->
																<!--[if !vml]><!-->
																<table class="icons-inner" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block; padding-left: 0px; padding-right: 0px;" cellpadding="0" cellspacing="0" role="presentation"><!--<![endif]-->
																	<tr>
																		<td style="vertical-align: middle; text-align: center; padding-top: 5px; padding-bottom: 5px; padding-left: 5px; padding-right: 6px;"><a href="https://designedwithbeefree.com/" target="_blank" style="text-decoration: none;"><img class="icon" alt="Beefree Logo" src="https://d1oco4z2z1fhwp.cloudfront.net/assets/Beefree-logo.png" height="auto" width="34" align="center" style="display: block; height: auto; margin: 0 auto; border: 0;"></a></td>
																		<td style="font-family: 'Inter', sans-serif; font-size: 15px; font-weight: undefined; color: #1e0e4b; vertical-align: middle; letter-spacing: undefined; text-align: center; line-height: normal;"><a href="https://designedwithbeefree.com/" target="_blank" style="color: #1e0e4b; text-decoration: none;">Designed with Beefree</a></td>
																	</tr>
																</table>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
				</td>
			</tr>
		</tbody>
	</table><!-- End -->
</body>

</html>
            `
        })
    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    releaseSeatsAndDeleteBooking,
    sendBookingConfirmationEmail,
];